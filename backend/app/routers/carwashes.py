from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import Optional
from datetime import date
import uuid

from app.database import get_db
from app.models.carwash import Carwash
from app.models.service import Service
from app.models.slot import Slot
from app.models.review import Review
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/carwashes", tags=["carwashes"])


@router.get("")
async def search_carwashes(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(5, le=50),
    rating_min: float = Query(0),
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    sql = text("""
        SELECT id, name, address, lat, lng, rating, reviews_count,
               ST_Distance(location::geography, ST_MakePoint(:lng, :lat)::geography) as distance
        FROM carwashes
        WHERE is_active = true
          AND ST_DWithin(location::geography, ST_MakePoint(:lng, :lat)::geography, :radius_m)
          AND rating >= :rating_min
        ORDER BY distance
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(sql, {
        "lat": lat, "lng": lng,
        "radius_m": radius * 1000,
        "rating_min": rating_min,
        "limit": limit,
        "offset": offset,
    })
    rows = result.mappings().all()
    return [dict(r) for r in rows]


@router.get("/{carwash_id}")
async def get_carwash(carwash_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Carwash).where(Carwash.id == carwash_id))
    cw = result.scalar_one_or_none()
    if not cw:
        raise HTTPException(404, "Мойка не найдена")
    return {
        "id": str(cw.id), "name": cw.name, "address": cw.address,
        "lat": cw.lat, "lng": cw.lng, "rating": cw.rating,
        "reviews_count": cw.reviews_count, "working_hours": cw.working_hours,
    }


@router.get("/{carwash_id}/services")
async def get_services(
    carwash_id: uuid.UUID,
    body_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    q = select(Service).where(Service.carwash_id == carwash_id, Service.is_active == True)
    if body_type:
        q = q.where(Service.body_type == body_type)
    result = await db.execute(q)
    svcs = result.scalars().all()
    return [
        {"id": str(s.id), "name": s.name, "body_type": s.body_type,
         "price": s.price, "duration_min": s.duration_min}
        for s in svcs
    ]


@router.get("/{carwash_id}/slots")
async def get_slots(
    carwash_id: uuid.UUID,
    date_filter: date = Query(alias="date"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Slot).where(
            Slot.carwash_id == carwash_id,
            Slot.starts_at >= f"{date_filter} 00:00:00+00",
            Slot.starts_at <= f"{date_filter} 23:59:59+00",
            Slot.booked < Slot.capacity,
        ).order_by(Slot.starts_at)
    )
    slots = result.scalars().all()
    return [
        {"id": str(s.id), "starts_at": s.starts_at.isoformat(),
         "capacity": s.capacity, "booked": s.booked}
        for s in slots
    ]


@router.get("/{carwash_id}/reviews")
async def get_reviews(
    carwash_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(Review).where(Review.carwash_id == carwash_id)
        .order_by(Review.created_at.desc())
        .limit(limit).offset(offset)
    )
    reviews = result.scalars().all()
    return [
        {"id": str(r.id), "rating": r.rating,
         "comment": r.comment, "created_at": r.created_at.isoformat()}
        for r in reviews
    ]