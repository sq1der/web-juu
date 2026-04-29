from sqlalchemy import Column, SmallInteger, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import text
from app.database import Base

class Slot(Base):
    __tablename__ = "slots"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    carwash_id = Column(UUID(as_uuid=True), ForeignKey("carwashes.id", ondelete="CASCADE"), nullable=False)
    starts_at = Column(TIMESTAMP(timezone=True), nullable=False)
    capacity = Column(SmallInteger, nullable=False, default=1)
    booked = Column(SmallInteger, nullable=False, default=0)