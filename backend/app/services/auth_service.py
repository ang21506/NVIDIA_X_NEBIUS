"""Authentication utilities: password hashing, JWT creation/verification."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from passlib.context import CryptContext

from backend.app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    token_version: int = 0,
) -> str:
    to_encode = data.copy()
    expire = (
        datetime.now(timezone.utc) + expires_delta
        if expires_delta
        else datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "ver": token_version})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


# ── Single-use token helpers (password reset / email verification) ─────────

def generate_auth_token() -> str:
    """Generate a cryptographically secure URL-safe raw token (never stored)."""
    return secrets.token_urlsafe(32)


def hash_auth_token(raw_token: str) -> str:
    """SHA-256 hex digest — this is what gets stored in the database."""
    return hashlib.sha256(raw_token.encode()).hexdigest()
