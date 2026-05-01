from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user
from app.services.auth_service import (
    hash_password, verify_password, normalize_phone, is_email
)

router = APIRouter(prefix="/users", tags=["users"])


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


@router.patch("/me")
async def update_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if data.name is not None:
        if not data.name.strip():
            raise HTTPException(400, "Имя не может быть пустым")
        user.name = data.name.strip()

    if data.email is not None:
        email = data.email.lower().strip()
        existing = await db.execute(select(User).where(User.email == email, User.id != user.id))
        if existing.scalar_one_or_none():
            raise HTTPException(400, "Email уже занят")
        user.email = email

    if data.phone is not None:
        phone = normalize_phone(data.phone)
        existing = await db.execute(select(User).where(User.phone == phone, User.id != user.id))
        if existing.scalar_one_or_none():
            raise HTTPException(400, "Телефон уже занят")
        user.phone = phone

    # Ensure at least one identifier remains
    if not user.phone and not user.email:
        raise HTTPException(400, "Должен остаться хотя бы телефон или email")

    await db.commit()
    return {"id": str(user.id), "name": user.name, "email": user.email, "phone": user.phone}


@router.patch("/me/password")
async def change_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(data.old_password, user.password_hash):
        raise HTTPException(400, "Неверный текущий пароль")
    if len(data.new_password) < 6:
        raise HTTPException(400, "Пароль минимум 6 символов")
    user.password_hash = hash_password(data.new_password)
    await db.commit()
    return {"ok": True}
