from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
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
)
from backend.app.api.deps import get_current_user
from backend.app.services.seed_service import SeedService
from backend.app.config import settings

router = APIRouter(prefix="/v1/auth", tags=["Authentication"])

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
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email})
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

    token = create_access_token({"sub": user.id, "email": user.email})
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
    token = create_access_token({"sub": user.id, "email": user.email})
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
