from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import uuid

from app.database import get_db
from app.models.booking import Booking
from app.models.slot import Slot
from app.models.user import User
from app.dependencies import require_role, get_current_user
from app.services.booking_service import create_booking

router = APIRouter(prefix="/bookings", tags=["bookings"])


class BookingIn(BaseModel):
    slot_id: uuid.UUID
    service_id: uuid.UUID
    car_id: uuid.UUID


class CancelIn(BaseModel):
    reason: Optional[str] = None


@router.get("")
async def list_bookings(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client")),
):
    q = select(Booking).where(Booking.user_id == user.id)
    if status:
        q = q.where(Booking.status == status)
    q = q.order_by(Booking.created_at.desc()).limit(limit).offset((page - 1) * limit)
    result = await db.execute(q)
    bookings = result.scalars().all()
    return [
        {"id": str(b.id), "status": b.status,
         "wash_status": b.wash_status, "created_at": b.created_at.isoformat()}
        for b in bookings
    ]


@router.get("/{booking_id}")
async def get_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Бронь не найдена")
    if str(booking.user_id) != str(user.id) and user.role not in ("owner", "admin"):
        raise HTTPException(403, "Нет доступа")
    return {
        "id": str(booking.id), "status": booking.status,
        "wash_status": booking.wash_status,
        "slot_id": str(booking.slot_id),
        "service_id": str(booking.service_id),
    }


@router.post("", status_code=201)
async def book(
    data: BookingIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client")),
):
    booking = await create_booking(
        db, str(user.id),
        str(data.slot_id), str(data.service_id), str(data.car_id)
    )
    return {"id": str(booking.id), "status": booking.status}


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: uuid.UUID,
    data: CancelIn = CancelIn(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client")),
):
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.user_id == user.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Бронь не найдена")
    if booking.status != "pending":
        raise HTTPException(409, "Отменить можно только pending бронь")

    booking.status = "cancelled"
    booking.cancel_reason = data.reason

    slot_res = await db.execute(select(Slot).where(Slot.id == booking.slot_id).with_for_update())
    slot = slot_res.scalar_one_or_none()
    if slot:
        slot.booked = max(0, slot.booked - 1)

    await db.commit()
    return {"ok": True}