from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from typing import Optional
import uuid

from app.database import get_db
from app.models.car import Car
from app.models.booking import Booking
from app.models.user import User
from app.dependencies import require_role

router = APIRouter(prefix="/cars", tags=["cars"])

BODY_TYPES = {"sedan", "hatchback", "suv", "minivan", "truck"}


class CarIn(BaseModel):
    brand: str
    model: str
    plate: str
    body_type: str
    color: Optional[str] = None


@router.get("")
async def list_cars(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client"))
):
    result = await db.execute(select(Car).where(Car.user_id == user.id))
    cars = result.scalars().all()
    return [
        {"id": str(c.id), "brand": c.brand, "model": c.model,
         "plate": c.plate, "body_type": c.body_type,
         "color": c.color, "is_default": c.is_default}
        for c in cars
    ]


@router.post("", status_code=201)
async def add_car(
    data: CarIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client"))
):
    if data.body_type not in BODY_TYPES:
        raise HTTPException(400, f"body_type должен быть одним из: {BODY_TYPES}")
    car = Car(user_id=user.id, **data.model_dump())
    db.add(car)
    await db.commit()
    await db.refresh(car)
    return {"id": str(car.id)}


@router.patch("/{car_id}")
async def update_car(
    car_id: uuid.UUID,
    data: CarIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client"))
):
    result = await db.execute(select(Car).where(Car.id == car_id, Car.user_id == user.id))
    car = result.scalar_one_or_none()
    if not car:
        raise HTTPException(404, "Машина не найдена")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(car, k, v)
    await db.commit()
    return {"ok": True}


@router.delete("/{car_id}")
async def delete_car(
    car_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client"))
):
    result = await db.execute(select(Car).where(Car.id == car_id, Car.user_id == user.id))
    car = result.scalar_one_or_none()
    if not car:
        raise HTTPException(404, "Машина не найдена")

    active = await db.execute(
        select(Booking).where(
            Booking.car_id == car_id,
            Booking.status.in_(["pending", "confirmed"])
        )
    )
    if active.scalar_one_or_none():
        raise HTTPException(409, "Есть активные брони на эту машину")

    await db.delete(car)
    await db.commit()
    return {"ok": True}


@router.patch("/{car_id}/default")
async def set_default(
    car_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("client"))
):
    result = await db.execute(select(Car).where(Car.id == car_id, Car.user_id == user.id))
    car = result.scalar_one_or_none()
    if not car:
        raise HTTPException(404, "Машина не найдена")

    await db.execute(update(Car).where(Car.user_id == user.id).values(is_default=False))
    car.is_default = True
    await db.commit()
    return {"ok": True}