"""Authentication routes: register, login, token refresh, password reset, email verification."""
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.auth_token import AuthToken
from backend.app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    UserResponse,
    UserProfileUpdate,
)
from backend.app.services.auth_service import (
    get_password_hash,
    verify_password,
    create_access_token,
    generate_auth_token,
    hash_auth_token,
)
from backend.app.api.deps import get_current_user
from backend.app.services.seed_service import SeedService
from backend.app.services.email_service import EmailService
from backend.app.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/auth", tags=["Authentication"])

# ── Registration / Login ──────────────────────────────────────────────────

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )
    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        timezone=payload.timezone,
        is_active=True,
        is_demo=False,
        is_email_verified=True,  # Skip email verification for now; wire up when EMAIL_PROVIDER is set
        token_version=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email}, token_version=user.token_version)
    return Token(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
    )


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    token = create_access_token({"sub": user.id, "email": user.email}, token_version=user.token_version)
    return Token(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
    )


@router.post("/demo-login", response_model=Token)
def demo_login(db: Session = Depends(get_db)):
    """
    Enables hackathon judges to enter the pre-seeded ML course experience immediately.
    """
    if settings.APP_ENV == "production" or not settings.ENABLE_DEMO_MODE:
        raise HTTPException(404, "Demo login is disabled")
    user = SeedService.seed_demo_data(db)
    token = create_access_token({"sub": user.id, "email": user.email}, token_version=user.token_version)
    return Token(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/profile", response_model=UserResponse)
def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.timezone is not None:
        current_user.timezone = payload.timezone
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Session revocation ────────────────────────────────────────────────────

@router.post("/logout-all", status_code=status.HTTP_200_OK)
def logout_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Invalidates all existing sessions for the current user by incrementing
    token_version. The calling token also becomes invalid after this call.
    Users will need to log in again on all devices.
    """
    current_user.token_version = (current_user.token_version or 0) + 1
    db.commit()
    return {"message": "All sessions have been revoked. Please log in again."}


# ── Password reset ────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Sends a password reset link. Returns the same response whether the email
    exists or not — prevents account enumeration.

    In production, EMAIL_PROVIDER must be configured. The token is never
    returned in the API response body.
    """
    generic_response = {
        "message": "If that email is registered, a password reset link has been sent."
    }

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Return generic response without revealing whether email exists
        return generic_response

    # Generate single-use token (raw token sent by email, hash stored in DB)
    raw_token = generate_auth_token()
    token_hash = hash_auth_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    # Invalidate any previous unused reset tokens for this user
    db.query(AuthToken).filter(
        AuthToken.user_id == user.id,
        AuthToken.purpose == "password_reset",
        AuthToken.used_at == None,
    ).delete()

    auth_token = AuthToken(
        user_id=user.id,
        token_hash=token_hash,
        purpose="password_reset",
        expires_at=expires_at.replace(tzinfo=None),
    )
    db.add(auth_token)
    db.commit()

    # Send email (logs token to console in development; uses SMTP in production)
    reset_link = f"[Your app URL]/reset-password?token={raw_token}"
    EmailService.send(
        to=user.email,
        subject="LearnLoop AI — Password Reset",
        body_text=(
            f"You requested a password reset for your LearnLoop AI account.\n\n"
            f"Reset link (expires in 1 hour):\n{reset_link}\n\n"
            "If you did not request this, ignore this email."
        ),
    )

    return generic_response


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Validates a password reset token, sets the new password, and invalidates
    all existing sessions via token_version increment.
    """
    token_hash = hash_auth_token(payload.token)
    auth_token = db.query(AuthToken).filter(
        AuthToken.token_hash == token_hash,
        AuthToken.purpose == "password_reset",
        AuthToken.used_at == None,
    ).first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if not auth_token or auth_token.expires_at < now:
        raise HTTPException(400, "Invalid or expired reset token.")

    user = db.query(User).filter(User.id == auth_token.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(400, "Invalid or expired reset token.")

    # Mark token as used (single-use)
    auth_token.used_at = now

    # Update password and revoke all sessions
    user.hashed_password = get_password_hash(payload.new_password)
    user.token_version = (user.token_version or 0) + 1

    db.commit()
    return {"message": "Password updated. Please log in with your new password."}


# ── Email verification ────────────────────────────────────────────────────

class VerifyEmailRequest(BaseModel):
    token: str


@router.post("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    """
    Marks a user's email as verified using a single-use token.
    """
    token_hash = hash_auth_token(payload.token)
    auth_token = db.query(AuthToken).filter(
        AuthToken.token_hash == token_hash,
        AuthToken.purpose == "email_verification",
        AuthToken.used_at == None,
    ).first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if not auth_token or auth_token.expires_at < now:
        raise HTTPException(400, "Invalid or expired verification token.")

    user = db.query(User).filter(User.id == auth_token.user_id).first()
    if not user:
        raise HTTPException(400, "Invalid or expired verification token.")

    auth_token.used_at = now
    user.is_email_verified = True
    user.email_verified_at = now

    db.commit()
    return {"message": "Email verified successfully."}
