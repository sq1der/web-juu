from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, date as date_type
import uuid

from app.database import get_db
from app.models.booking import Booking
from app.models.carwash import Carwash
from app.models.service import Service
from app.models.slot import Slot
from app.models.user import User
from app.dependencies import require_role
from app.ws.manager import manager

router = APIRouter(prefix="/operator", tags=["operator"])


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner")),
):
    cw = await get_owner_carwash(user, db)
    cw_id = str(cw.id)

    # Bookings by status
    by_status = await db.execute(text("""
        SELECT b.status, COUNT(*) AS cnt
        FROM bookings b
        JOIN slots s ON s.id = b.slot_id
        WHERE s.carwash_id = :cw_id
        GROUP BY b.status
    """), {"cw_id": cw_id})
    status_counts = {row.status: row.cnt for row in by_status}

    # Bookings by hour of day (confirmed + pending)
    by_hour = await db.execute(text("""
        SELECT EXTRACT(HOUR FROM s.starts_at AT TIME ZONE 'UTC') AS hour, COUNT(*) AS cnt
        FROM bookings b
        JOIN slots s ON s.id = b.slot_id
        WHERE s.carwash_id = :cw_id AND b.status != 'cancelled'
        GROUP BY hour
        ORDER BY hour
    """), {"cw_id": cw_id})
    hourly = [{"hour": int(row.hour), "bookings": row.cnt} for row in by_hour]

    # Revenue estimate from confirmed bookings
    revenue = await db.execute(text("""
        SELECT COALESCE(SUM(sv.price), 0) AS total
        FROM bookings b
        JOIN slots s ON s.id = b.slot_id
        JOIN services sv ON sv.id = b.service_id
        WHERE s.carwash_id = :cw_id AND b.status = 'confirmed'
    """), {"cw_id": cw_id})
    total_revenue = revenue.scalar()

    return {
        "bookings_by_status": status_counts,
        "bookings_by_hour": hourly,
        "revenue_confirmed": total_revenue,
        "rating": cw.rating,
        "reviews_count": cw.reviews_count,
    }



class CarwashUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    working_hours: Optional[dict] = None


class CancelIn(BaseModel):
    reason: Optional[str] = None


class WashStatusIn(BaseModel):
    wash_status: str


class ServiceIn(BaseModel):
    name: str
    body_type: str
    price: int
    duration_min: int


class SlotIn(BaseModel):
    starts_at: datetime
    capacity: int = 1


class BulkSlotsIn(BaseModel):
    slots: List[SlotIn]


async def get_owner_carwash(user: User, db: AsyncSession) -> Carwash:
    result = await db.execute(select(Carwash).where(Carwash.owner_id == user.id))
    cw = result.scalar_one_or_none()
    if not cw:
        raise HTTPException(404, "Мойка не найдена. Сначала создайте мойку.")
    return cw


# --- Мойка ---

@router.get("/carwash")
async def get_my_carwash(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner"))
):
    cw = await get_owner_carwash(user, db)
    return {
        "id": str(cw.id), "name": cw.name, "address": cw.address,
        "lat": cw.lat, "lng": cw.lng, "rating": cw.rating,
        "working_hours": cw.working_hours,
    }


@router.patch("/carwash")
async def update_my_carwash(
    data: CarwashUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner"))
):
    cw = await get_owner_carwash(user, db)
    for k, v in data.model_dump(exclude_none=True).items():
        if k not in ("lat", "lng"):
            setattr(cw, k, v)
    if data.lat is not None and data.lng is not None:
        cw.lat = data.lat
        cw.lng = data.lng
        await db.execute(
            text("UPDATE carwashes SET location = ST_MakePoint(:lng, :lat) WHERE id = :id"),
            {"lng": data.lng, "lat": data.lat, "id": str(cw.id)}
        )
    await db.commit()
    return {"ok": True}


# --- Брони ---

@router.get("/bookings")
async def get_bookings(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner")),
):
    cw = await get_owner_carwash(user, db)
    q = (
        select(Booking)
        .join(Slot, Booking.slot_id == Slot.id)
        .where(Slot.carwash_id == cw.id)
    )
    if status:
        q = q.where(Booking.status == status)
    q = q.order_by(Booking.created_at.desc()).limit(limit).offset((page - 1) * limit)
    result = await db.execute(q)
    bookings = result.scalars().all()
    return [
        {"id": str(b.id), "status": b.status,
         "wash_status": b.wash_status, "user_id": str(b.user_id)}
        for b in bookings
    ]


@router.post("/bookings/{booking_id}/confirm")
async def confirm_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner")),
):
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking or booking.status != "pending":
        raise HTTPException(404, "Бронь не найдена или не в статусе pending")
    booking.status = "confirmed"
    booking.wash_status = "waiting"
    booking.confirmed_at = datetime.now(timezone.utc)
    await db.commit()
    await manager.send_booking_update(str(booking_id), {
        "event": "confirmed", "wash_status": "waiting"
    })
    return {"ok": True}


@router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(
    booking_id: uuid.UUID,
    data: CancelIn = CancelIn(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner")),
):
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking or booking.status not in ("pending", "confirmed"):
        raise HTTPException(404, "Бронь не найдена или уже завершена")
    booking.status = "cancelled"
    booking.cancel_reason = data.reason

    slot_res = await db.execute(select(Slot).where(Slot.id == booking.slot_id).with_for_update())
    slot = slot_res.scalar_one_or_none()
    if slot:
        slot.booked = max(0, slot.booked - 1)

    await db.commit()
    await manager.send_booking_update(str(booking_id), {"event": "cancelled"})
    return {"ok": True}


@router.patch("/bookings/{booking_id}/washstatus")
async def update_wash_status(
    booking_id: uuid.UUID,
    data: WashStatusIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner")),
):
    if data.wash_status not in {"waiting", "in_progress", "done"}:
        raise HTTPException(400, "wash_status должен быть: waiting, in_progress или done")
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Бронь не найдена")
    booking.wash_status = data.wash_status
    await db.commit()
    await manager.send_booking_update(str(booking_id), {
        "event": "wash_status", "wash_status": data.wash_status
    })
    return {"ok": True}


# --- Услуги ---

@router.get("/services")
async def list_services(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner"))
):
    cw = await get_owner_carwash(user, db)
    result = await db.execute(select(Service).where(Service.carwash_id == cw.id))
    svcs = result.scalars().all()
    return [
        {"id": str(s.id), "name": s.name, "body_type": s.body_type,
         "price": s.price, "duration_min": s.duration_min, "is_active": s.is_active}
        for s in svcs
    ]


@router.post("/services", status_code=201)
async def create_service(
    data: ServiceIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner"))
):
    cw = await get_owner_carwash(user, db)
    svc = Service(carwash_id=cw.id, **data.model_dump())
    db.add(svc)
    await db.commit()
    await db.refresh(svc)
    return {"id": str(svc.id)}


@router.patch("/services/{service_id}")
async def update_service(
    service_id: uuid.UUID,
    data: ServiceIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner"))
):
    cw = await get_owner_carwash(user, db)
    result = await db.execute(
        select(Service).where(Service.id == service_id, Service.carwash_id == cw.id)
    )
    svc = result.scalar_one_or_none()
    if not svc:
        raise HTTPException(404, "Услуга не найдена")
    for k, v in data.model_dump().items():
        setattr(svc, k, v)
    await db.commit()
    return {"ok": True}


@router.delete("/services/{service_id}")
async def delete_service(
    service_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner"))
):
    cw = await get_owner_carwash(user, db)
    result = await db.execute(
        select(Service).where(Service.id == service_id, Service.carwash_id == cw.id)
    )
    svc = result.scalar_one_or_none()
    if not svc:
        raise HTTPException(404, "Услуга не найдена")
    await db.delete(svc)
    await db.commit()
    return {"ok": True}


# --- Слоты ---

@router.get("/slots")
async def list_slots(
    date_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner"))
):
    cw = await get_owner_carwash(user, db)
    q = select(Slot).where(Slot.carwash_id == cw.id)
    if date_filter:
        parsed = date_type.fromisoformat(date_filter)
        day_start = datetime(parsed.year, parsed.month, parsed.day, 0, 0, 0, tzinfo=timezone.utc)
        day_end   = datetime(parsed.year, parsed.month, parsed.day, 23, 59, 59, tzinfo=timezone.utc)
        q = q.where(
            Slot.starts_at >= day_start,
            Slot.starts_at <= day_end,
        )
    result = await db.execute(q.order_by(Slot.starts_at))
    slots = result.scalars().all()
    return [
        {"id": str(s.id), "starts_at": s.starts_at.isoformat(),
         "capacity": s.capacity, "booked": s.booked}
        for s in slots
    ]


@router.post("/slots", status_code=201)
async def create_slots(
    data: BulkSlotsIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner"))
):
    cw = await get_owner_carwash(user, db)
    for s in data.slots:
        slot = Slot(carwash_id=cw.id, starts_at=s.starts_at, capacity=s.capacity)
        db.add(slot)
    await db.commit()
    return {"created": len(data.slots)}


@router.patch("/slots/{slot_id}")
async def update_slot(
    slot_id: uuid.UUID,
    data: SlotIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner"))
):
    cw = await get_owner_carwash(user, db)
    result = await db.execute(
        select(Slot).where(Slot.id == slot_id, Slot.carwash_id == cw.id)
    )
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(404, "Слот не найден")
    slot.starts_at = data.starts_at
    slot.capacity = data.capacity
    await db.commit()
    return {"ok": True}


@router.delete("/slots/{slot_id}")
async def delete_slot(
    slot_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("owner"))
):
    cw = await get_owner_carwash(user, db)
    result = await db.execute(
        select(Slot).where(Slot.id == slot_id, Slot.carwash_id == cw.id)
    )
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(404, "Слот не найден")
    if slot.booked > 0:
        raise HTTPException(409, "В слоте есть активные брони")
    await db.delete(slot)
    await db.commit()
    return {"ok": True}