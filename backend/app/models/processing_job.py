"""Background document processing jobs (PostgreSQL-backed durable queue).

Keeps long-running extraction, chunking, and embedding work out of the upload
request. Supports bounded retries, exponential backoff, and recovery after a
worker crash. Jobs are idempotent — reprocessing the same resource is safe.
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from backend.app.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    resource_id = Column(String(36), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # PENDING → RUNNING → DONE | FAILED | CANCELLED
    status = Column(String(32), default="PENDING", nullable=False, index=True)
    attempt_count = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=3, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    # When to run the next attempt (exponential backoff)
    next_attempt_at = Column(DateTime, nullable=True)

