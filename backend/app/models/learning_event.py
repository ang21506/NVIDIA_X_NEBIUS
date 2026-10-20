"""Append-only assessment evidence; current mastery is a separate projection."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, CheckConstraint
from backend.app.database import Base


class MasteryEvent(Base):
    __tablename__ = "mastery_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    quiz_answer_id = Column(String(36), ForeignKey("quiz_answers.id", ondelete="CASCADE"), nullable=False, unique=True)
    previous_score = Column(Float, nullable=False)
    new_score = Column(Float, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    __table_args__ = (
        CheckConstraint("previous_score >= 0 AND previous_score <= 1", name="ck_event_previous_score"),
        CheckConstraint("new_score >= 0 AND new_score <= 1", name="ck_event_new_score"),
    )
