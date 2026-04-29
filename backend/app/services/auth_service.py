import re
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("8") and len(digits) == 11:
        digits = "7" + digits[1:]
    return f"+{digits}"

def is_email(identifier: str) -> bool:
    return "@" in identifier

def create_access_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(seconds=settings.ACCESS_TOKEN_TTL)
    return jwt.encode({"user_id": user_id, "role": role, "exp": exp}, settings.SECRET_KEY, algorithm="HS256")

def create_refresh_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(seconds=settings.REFRESH_TOKEN_TTL)
    return jwt.encode({"user_id": user_id, "role": role, "exp": exp}, settings.SECRET_KEY, algorithm="HS256")