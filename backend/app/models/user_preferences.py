"""Persistent user preferences and study session tracking."""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Index
from backend.app.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    # One row per user. Uniqueness enforced by ix_user_preferences_user_id (unique=True).
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    learning_goals = Column(Text, nullable=True)  # JSON array of goal strings
    available_hours_per_week = Column(Float, nullable=True)
    preferred_session_duration_minutes = Column(Integer, server_default="45")
    timezone = Column(String(64), server_default="UTC")
    onboarding_completed = Column(Boolean, server_default="0")
    created_at = Column(DateTime, default=datetime.utcnow, server_default="now()")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, server_default="now()")

    __table_args__ = (
        Index("ix_user_preferences_user_id", "user_id", unique=True),
    )


class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)        # null = session in progress
    duration_seconds = Column(Integer, nullable=True)  # computed when ended; null until then
    session_type = Column(String(32), server_default="study")  # 'study', 'quiz', 'tutor'
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default="now()")

    __table_args__ = (
        Index("ix_study_sessions_user_id", "user_id"),
        Index("ix_study_sessions_course_id", "course_id"),
    )
