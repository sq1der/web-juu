from sqlalchemy import Column, String, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import text
from app.database import Base

class Service(Base):
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    carwash_id = Column(UUID(as_uuid=True), ForeignKey("carwashes.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    body_type = Column(String(20), nullable=False)
    price = Column(Integer, nullable=False)
    duration_min = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)