from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Float, Text, Date, DateTime, ForeignKey
from backend.app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class StudyTask(Base):
    __tablename__ = "study_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    due_date = Column(Date, nullable=False)
    estimated_minutes = Column(Integer, default=30)
    priority_score = Column(Float, default=0.5, nullable=False)
    # Stored as JSON list of strings: ["LOW_MASTERY", "EXAM_URGENCY", "RECENT_ERROR", "REVISION_DUE", "PREREQUISITE_GAP"]
    reason_codes = Column(Text, nullable=False, default="[]")
    # Statuses: RECOMMENDED, IN_PROGRESS, COMPLETED, RESCHEDULED
    status = Column(String(32), default="RECOMMENDED", nullable=False, index=True)
    completion_evidence = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
