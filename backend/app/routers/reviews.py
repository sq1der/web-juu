from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
from typing import Optional
import uuid

from app.database import get_db
from app.models.review import Review
from app.models.booking import Booking
from app.models.user import User
from app.dependencies import require_role

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewIn(BaseModel):
    booking_id: uuid.UUID
    rating: int
    comment: Optional[str] = None


@router.post("", status_code=201)
async def create_review(
    data: ReviewIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client"))
):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(400, "Рейтинг должен быть от 1 до 5")

    # Проверяем что бронь существует и принадлежит клиенту
    booking_res = await db.execute(
        select(Booking).where(
            Booking.id == data.booking_id,
            Booking.user_id == user.id
        )
    )
    booking = booking_res.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Бронь не найдена")
    if booking.status != "confirmed":
        raise HTTPException(400, "Отзыв можно оставить только на подтверждённую бронь")

    # Проверяем что отзыв ещё не оставлен
    exists = await db.execute(
        select(Review).where(Review.booking_id == data.booking_id)
    )
    if exists.scalar_one_or_none():
        raise HTTPException(409, "Отзыв на эту бронь уже оставлен")

    # Получаем carwash_id через слот
    from app.models.slot import Slot
    from app.models.carwash import Carwash
    slot_res = await db.execute(select(Slot).where(Slot.id == booking.slot_id))
    slot = slot_res.scalar_one_or_none()

    review = Review(
        booking_id=data.booking_id,
        user_id=user.id,
        carwash_id=slot.carwash_id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    await db.commit()

    # Пересчитываем рейтинг мойки
    await db.execute(text("""
        UPDATE carwashes
        SET rating = (SELECT AVG(rating) FROM reviews WHERE carwash_id = :cw_id),
            reviews_count = (SELECT COUNT(*) FROM reviews WHERE carwash_id = :cw_id)
        WHERE id = :cw_id
    """), {"cw_id": str(slot.carwash_id)})
    await db.commit()
    await db.refresh(review)

    return {"id": str(review.id), "rating": review.rating}


@router.delete("/{review_id}")
async def delete_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client"))
):
    result = await db.execute(
        select(Review).where(
            Review.id == review_id,
            Review.user_id == user.id
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(404, "Отзыв не найден")

    carwash_id = review.carwash_id
    await db.delete(review)
    await db.commit()

    # Пересчитываем рейтинг после удаления
    await db.execute(text("""
        UPDATE carwashes
        SET rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE carwash_id = :cw_id), 0),
            reviews_count = (SELECT COUNT(*) FROM reviews WHERE carwash_id = :cw_id)
        WHERE id = :cw_id
    """), {"cw_id": str(carwash_id)})
    await db.commit()

    return {"ok": True}