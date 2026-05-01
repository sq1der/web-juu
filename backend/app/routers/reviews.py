from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
from typing import Optional
import uuid

from app.database import get_db
from app.models.booking import Booking
from app.models.review import Review
from app.models.slot import Slot
from app.models.user import User
from app.dependencies import require_role, get_current_user

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewIn(BaseModel):
    booking_id: uuid.UUID
    rating: int
    comment: Optional[str] = None


async def _recalc_rating(db: AsyncSession, carwash_id: str) -> None:
    await db.execute(
        text("""
            UPDATE carwashes
            SET rating       = COALESCE((SELECT AVG(rating)  FROM reviews WHERE carwash_id = :cw_id), 0),
                reviews_count = (SELECT COUNT(*) FROM reviews WHERE carwash_id = :cw_id)
            WHERE id = :cw_id
        """),
        {"cw_id": carwash_id},
    )


@router.post("", status_code=201)
async def create_review(
    data: ReviewIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client")),
):
    if not (1 <= data.rating <= 5):
        raise HTTPException(400, "Оценка должна быть от 1 до 5")

    # Booking must belong to the user and not be cancelled
    result = await db.execute(
        select(Booking).where(Booking.id == data.booking_id, Booking.user_id == user.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Бронь не найдена")
    if booking.status == "cancelled":
        raise HTTPException(400, "Нельзя оставить отзыв на отменённую бронь")

    # One review per booking
    existing = await db.execute(select(Review).where(Review.booking_id == data.booking_id))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Отзыв на эту бронь уже существует")

    # Resolve carwash_id via slot
    slot_res = await db.execute(select(Slot).where(Slot.id == booking.slot_id))
    slot = slot_res.scalar_one_or_none()
    if not slot:
        raise HTTPException(500, "Слот не найден")

    review = Review(
        booking_id=data.booking_id,
        user_id=user.id,
        carwash_id=slot.carwash_id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    await db.flush()
    await _recalc_rating(db, str(slot.carwash_id))
    await db.commit()
    await db.refresh(review)
    return {"id": str(review.id)}


@router.delete("/{review_id}")
async def delete_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(404, "Отзыв не найден")
    if str(review.user_id) != str(user.id) and user.role not in ("admin",):
        raise HTTPException(403, "Нет доступа")

    carwash_id = str(review.carwash_id)
    await db.delete(review)
    await db.flush()
    await _recalc_rating(db, carwash_id)
    await db.commit()
    return {"ok": True}
