"""Single-use expiring tokens for email verification and password reset.

Tokens are stored as SHA-256 hashes. The raw token is sent to the user's
email and never stored in the database or returned in API responses.
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from backend.app.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # SHA-256 hex of the raw token — raw token is sent by email, never stored.
    # Uniqueness enforced via index (ix_auth_tokens_token_hash) created in migration 0004.
    token_hash = Column(String(64), nullable=False)
    purpose = Column(String(32), nullable=False)  # 'email_verification' | 'password_reset'
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)  # set on first valid use (single-use)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_auth_tokens_user_id", "user_id"),
        Index("ix_auth_tokens_token_hash", "token_hash", unique=True),
    )
