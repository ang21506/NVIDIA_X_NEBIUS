from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer
from backend.app.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    timezone = Column(String(64), default="UTC")
    is_active = Column(Boolean, default=True)
    is_demo = Column(Boolean, default=False)
    # nullable=True to match migration ADD COLUMN semantics on SQLite;
    # server_default='1' fills existing rows so the effective value is always set.
    is_email_verified = Column(Boolean, nullable=True, server_default="1")
    email_verified_at = Column(DateTime, nullable=True)
    # Increment to invalidate all existing sessions (logout-all, password change).
    # nullable=True matches ADD COLUMN; server_default='0' ensures the column is always filled.
    token_version = Column(Integer, nullable=True, server_default="0")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
