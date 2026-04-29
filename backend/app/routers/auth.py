from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from jose import jwt, JWTError

from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user
from app.config import settings
from app.services.auth_service import (
    hash_password, verify_password, normalize_phone,
    is_email, create_access_token, create_refresh_token
)

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterIn(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    password: str
    name: str
    role: str  # client | owner


class LoginIn(BaseModel):
    identifier: str
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


@router.post("/register", status_code=201)
async def register(data: RegisterIn, db: AsyncSession = Depends(get_db)):
    if not data.phone and not data.email:
        raise HTTPException(400, "Нужен телефон или email")
    if data.role not in ("client", "owner"):
        raise HTTPException(400, "role должен быть client или owner")
    if len(data.password) < 6:
        raise HTTPException(400, "Пароль минимум 6 символов")

    phone = normalize_phone(data.phone) if data.phone else None
    email = data.email.lower() if data.email else None

    if phone:
        exists = await db.execute(select(User).where(User.phone == phone))
        if exists.scalar_one_or_none():
            raise HTTPException(400, "Телефон уже зарегистрирован")
    if email:
        exists = await db.execute(select(User).where(User.email == email))
        if exists.scalar_one_or_none():
            raise HTTPException(400, "Email уже зарегистрирован")

    user = User(
        phone=phone,
        email=email,
        password_hash=hash_password(data.password),
        name=data.name,
        role=data.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": str(user.id), "name": user.name, "role": user.role}


@router.post("/login")
async def login(data: LoginIn, db: AsyncSession = Depends(get_db)):
    if is_email(data.identifier):
        result = await db.execute(select(User).where(User.email == data.identifier.lower()))
    else:
        phone = normalize_phone(data.identifier)
        result = await db.execute(select(User).where(User.phone == phone))

    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Неверный логин или пароль")
    if not user.is_active:
        raise HTTPException(401, "Аккаунт заблокирован")

    return {
        "access_token": create_access_token(str(user.id), user.role),
        "refresh_token": create_refresh_token(str(user.id), user.role),
        "token_type": "bearer",
    }


@router.post("/refresh")
async def refresh(data: RefreshIn):
    try:
        payload = jwt.decode(data.refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        role = payload.get("role")
        if not user_id:
            raise HTTPException(401, "Невалидный refresh token")
    except JWTError:
        raise HTTPException(401, "Невалидный refresh token")

    return {"access_token": create_access_token(user_id, role), "token_type": "bearer"}


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
    }