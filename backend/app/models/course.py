from datetime import datetime, date
from sqlalchemy import Column, String, Text, Date, Integer, DateTime, ForeignKey
from backend.app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    code = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    exam_date = Column(Date, nullable=True)
    learning_objectives = Column(Text, nullable=True)
    available_hours_per_week = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
