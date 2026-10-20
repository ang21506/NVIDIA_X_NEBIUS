from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from backend.app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class QuizItem(Base):
    __tablename__ = "quiz_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    options_json = Column(Text, nullable=False)  # JSON list of strings
    correct_answer = Column(String(255), nullable=False)
    explanation = Column(Text, nullable=False)
    rubric = Column(Text, nullable=True)
    difficulty = Column(String(32), default="medium")  # easy, medium, hard
    target_misconception = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    total_items = Column(Integer, default=0, nullable=False)
    correct_items = Column(Integer, default=0, nullable=False)
    score_percentage = Column(Float, default=0.0, nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    idempotency_key = Column(String(128), nullable=True)
    request_hash = Column(String(64), nullable=True)
    result_json = Column(Text, nullable=True)
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_user_quiz_request"),
        CheckConstraint("score_percentage >= 0 AND score_percentage <= 100", name="ck_quiz_score"),
        CheckConstraint("correct_items >= 0 AND correct_items <= total_items", name="ck_quiz_counts"),
    )

class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    attempt_id = Column(String(36), ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    quiz_item_id = Column(String(36), ForeignKey("quiz_items.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_answer = Column(String(255), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    detected_misconception = Column(Text, nullable=True)
    evidence_quote = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("attempt_id", "quiz_item_id", name="uq_attempt_question"),)
