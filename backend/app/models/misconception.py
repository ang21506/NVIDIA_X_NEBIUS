from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from backend.app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Misconception(Base):
    __tablename__ = "misconceptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    evidence_question = Column(Text, nullable=False)
    evidence_answer = Column(Text, nullable=False)
    expected_concept = Column(Text, nullable=False)
    
    confidence = Column(Float, default=0.85, nullable=False)
    remediation_provided = Column(Text, nullable=True)
    # Statuses: NEWLY_DETECTED, NEEDS_REMEDIATION, NEEDS_RETEST, RESOLVED
    status = Column(String(32), default="NEWLY_DETECTED", nullable=False, index=True)
    next_review_at = Column(DateTime, nullable=True)
    attempt_count = Column(Integer, default=1)
    last_assessed_outcome = Column(String(32), default="INCORRECT")
    resolved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
