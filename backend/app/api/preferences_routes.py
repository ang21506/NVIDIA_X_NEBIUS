"""User preferences and study session endpoints.

Preferences are persisted in the database (one row per user) instead of
browser localStorage. Study sessions record actual measured time, not
fabricated analytics.
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.user_preferences import UserPreferences, StudySession
from backend.app.api.deps import get_current_user

router = APIRouter(tags=["Preferences & Study Sessions"])


# ── Schemas ───────────────────────────────────────────────────────────────

class PreferencesRequest(BaseModel):
    learning_goals: Optional[str] = None        # JSON string or plain text
    available_hours_per_week: Optional[float] = None
    preferred_session_duration_minutes: Optional[int] = None
    timezone: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class PreferencesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    learning_goals: Optional[str]
    available_hours_per_week: Optional[float]
    preferred_session_duration_minutes: int
    timezone: str
    onboarding_completed: bool
    created_at: datetime
    updated_at: datetime


class StudySessionStartRequest(BaseModel):
    course_id: Optional[str] = None
    session_type: str = "study"


class StudySessionEndRequest(BaseModel):
    duration_seconds: Optional[int] = None  # if null, computed from started_at


class StudySessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    course_id: Optional[str]
    started_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    session_type: str
    created_at: datetime


# ── Preferences ───────────────────────────────────────────────────────────

@router.get("/v1/preferences", response_model=PreferencesResponse)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == current_user.id).first()
    if not prefs:
        raise HTTPException(status_code=404, detail="No preferences set yet")
    return prefs


@router.put("/v1/preferences", response_model=PreferencesResponse, status_code=status.HTTP_200_OK)
def upsert_preferences(
    payload: PreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == current_user.id).first()
    if prefs is None:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)

    if payload.learning_goals is not None:
        prefs.learning_goals = payload.learning_goals
    if payload.available_hours_per_week is not None:
        prefs.available_hours_per_week = payload.available_hours_per_week
    if payload.preferred_session_duration_minutes is not None:
        prefs.preferred_session_duration_minutes = payload.preferred_session_duration_minutes
    if payload.timezone is not None:
        prefs.timezone = payload.timezone
    if payload.onboarding_completed is not None:
        prefs.onboarding_completed = payload.onboarding_completed

    db.commit()
    db.refresh(prefs)
    return prefs


# ── Study Sessions ────────────────────────────────────────────────────────

@router.post("/v1/study-sessions/start", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED)
def start_study_session(
    payload: StudySessionStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Start a new study session. Returns the session ID.
    Call /end when the session concludes to record actual duration.
    Duration is measured server-side; do not rely on client-supplied timing alone.
    """
    session = StudySession(
        user_id=current_user.id,
        course_id=payload.course_id,
        session_type=payload.session_type,
        started_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/v1/study-sessions/{session_id}/end", response_model=StudySessionResponse)
def end_study_session(
    session_id: str,
    payload: StudySessionEndRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    End a study session and record its duration.
    If duration_seconds is provided, it is used (capped at 12 hours to prevent abuse).
    Otherwise, duration is computed from started_at to now.
    """
    session = db.query(StudySession).filter(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(404, "Study session not found")
    if session.ended_at is not None:
        raise HTTPException(409, "Session already ended")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    session.ended_at = now

    if payload.duration_seconds is not None:
        # Cap at 12 hours (43200 seconds) to prevent inflated analytics
        session.duration_seconds = max(0, min(payload.duration_seconds, 43200))
    else:
        elapsed = (now - session.started_at).total_seconds()
        session.duration_seconds = int(max(0, min(elapsed, 43200)))

    db.commit()
    db.refresh(session)
    return session


@router.get("/v1/study-sessions", response_model=List[StudySessionResponse])
def list_study_sessions(
    course_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List study sessions for the current user, optionally filtered by course.
    Only returns sessions with real recorded data — never fabricated.
    """
    query = db.query(StudySession).filter(StudySession.user_id == current_user.id)
    if course_id:
        query = query.filter(StudySession.course_id == course_id)
    sessions = query.order_by(StudySession.started_at.desc()).limit(100).all()
    return sessions

