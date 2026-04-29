from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.models.slot import Slot
from app.models.booking import Booking
from app.models.service import Service
from app.models.car import Car
from app.models.carwash import Carwash
from app.ws.manager import manager

async def create_booking(db: AsyncSession, user_id: str, slot_id: str, service_id: str, car_id: str) -> Booking:
    # Берём слот с блокировкой чтобы не было двойного бронирования
    slot_res = await db.execute(select(Slot).where(Slot.id == slot_id).with_for_update())
    slot = slot_res.scalar_one_or_none()
    if not slot:
        raise HTTPException(404, "Slot not found")
    if slot.booked >= slot.capacity:
        raise HTTPException(409, "Slot is full")

    # Услуга должна принадлежать той же мойке что и слот
    svc_res = await db.execute(select(Service).where(Service.id == service_id))
    service = svc_res.scalar_one_or_none()
    if not service or str(service.carwash_id) != str(slot.carwash_id):
        raise HTTPException(400, "Service does not belong to this carwash")

    # Машина должна принадлежать пользователю
    car_res = await db.execute(select(Car).where(Car.id == car_id, Car.user_id == user_id))
    car = car_res.scalar_one_or_none()
    if not car:
        raise HTTPException(403, "Car not found or not yours")

    # Создаём бронь
    booking = Booking(
        user_id=user_id,
        car_id=car_id,
        slot_id=slot_id,
        service_id=service_id,
        status="pending",
    )
    db.add(booking)
    slot.booked += 1
    await db.commit()
    await db.refresh(booking)

    # Уведомляем оператора через WebSocket
    cw_res = await db.execute(select(Carwash).where(Carwash.id == slot.carwash_id))
    carwash = cw_res.scalar_one_or_none()
    if carwash:
        await manager.send_operator_update(str(carwash.owner_id), {
            "event": "new_booking",
            "booking_id": str(booking.id),
        })

    return booking