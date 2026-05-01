from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.database import get_db
from app.models.favorite import Favorite
from app.models.carwash import Carwash
from app.models.user import User
from app.dependencies import require_role

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("")
async def list_favorites(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client"))
):
    result = await db.execute(
        select(Favorite).where(Favorite.user_id == user.id)
    )
    favs = result.scalars().all()
    return [{"id": str(f.id), "carwash_id": str(f.carwash_id)} for f in favs]


@router.post("/{carwash_id}", status_code=201)
async def add_favorite(
    carwash_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client"))
):
    # Проверяем что мойка существует
    cw = await db.execute(select(Carwash).where(Carwash.id == carwash_id))
    if not cw.scalar_one_or_none():
        raise HTTPException(404, "Мойка не найдена")

    # Проверяем что ещё не в избранном
    exists = await db.execute(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.carwash_id == carwash_id
        )
    )
    if exists.scalar_one_or_none():
        raise HTTPException(409, "Уже в избранном")

    fav = Favorite(user_id=user.id, carwash_id=carwash_id)
    db.add(fav)
    await db.commit()
    await db.refresh(fav)
    return {"id": str(fav.id), "carwash_id": str(fav.carwash_id)}


@router.delete("/{carwash_id}")
async def remove_favorite(
    carwash_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client"))
):
    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.carwash_id == carwash_id
        )
    )
    fav = result.scalar_one_or_none()
    if not fav:
        raise HTTPException(404, "Не найдено в избранном")

    await db.delete(fav)
    await db.commit()
    return {"ok": True}