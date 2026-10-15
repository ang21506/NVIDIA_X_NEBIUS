from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.course import Course
from backend.app.models.topic import Topic, MasteryState
from backend.app.models.misconception import Misconception
from backend.app.schemas.memory import (
    MisconceptionResponse,
    MasteryResponse,
    MemorySummaryResponse,
)
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/v1/memory", tags=["Learning Memory"])

@router.get("", response_model=MemorySummaryResponse)
def get_memory_summary(
    course_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    misc_query = db.query(Misconception).filter(Misconception.user_id == current_user.id)
    if course_id:
        misc_query = misc_query.filter(Misconception.course_id == course_id)
    misconceptions = misc_query.order_by(Misconception.created_at.desc()).all()

    open_misc_count = sum(1 for m in misconceptions if m.status != "RESOLVED")
    resolved_misc_count = sum(1 for m in misconceptions if m.status == "RESOLVED")

    # Topic Masteries
    topic_query = db.query(Topic).join(Course, Topic.course_id == Course.id).filter(Course.user_id == current_user.id)
    if course_id:
        topic_query = topic_query.filter(Topic.course_id == course_id)
    topics = topic_query.all()

    masteries: List[MasteryResponse] = []
    scores = []
    for t in topics:
        m = (
            db.query(MasteryState)
            .filter(MasteryState.user_id == current_user.id, MasteryState.topic_id == t.id)
            .first()
        )
        score = m.mastery_score if m else 0.20
        scores.append(score)
        masteries.append(
            MasteryResponse(
                id=m.id if m else f"virtual_{t.id}",
                topic_id=t.id,
                topic_title=t.title,
                course_id=t.course_id,
                mastery_score=score,
                confidence_score=m.confidence_score if m else 0.10,
                evidence_count=m.evidence_count if m else 0,
                correct_count=m.correct_count if m else 0,
                total_count=m.total_count if m else 0,
                last_assessed_at=m.last_assessed_at if m else None,
                updated_at=m.updated_at if m else t.created_at,
            )
        )

    avg_mastery = round(sum(scores) / len(scores), 3) if scores else 0.0
    mastered = sum(1 for s in scores if s >= 0.75)
    in_progress = sum(1 for s in scores if 0.50 <= s < 0.75)
    needs_attention = sum(1 for s in scores if s < 0.50)

    # Attach topic title to misconceptions
    misc_responses = []
    topic_map = {t.id: t.title for t in topics}
    for m in misconceptions:
        misc_responses.append(
            MisconceptionResponse(
                id=m.id,
                user_id=m.user_id,
                course_id=m.course_id,
                topic_id=m.topic_id,
                topic_title=topic_map.get(m.topic_id, "General Topic"),
                title=m.title,
                description=m.description,
                evidence_question=m.evidence_question,
                evidence_answer=m.evidence_answer,
                expected_concept=m.expected_concept,
                confidence=m.confidence,
                remediation_provided=m.remediation_provided,
                status=m.status,
                next_review_at=m.next_review_at,
                attempt_count=m.attempt_count,
                last_assessed_outcome=m.last_assessed_outcome,
                resolved_at=m.resolved_at,
                created_at=m.created_at,
                updated_at=m.updated_at,
            )
        )

    return MemorySummaryResponse(
        total_topics=len(topics),
        mastered_topics=mastered,
        in_progress_topics=in_progress,
        needs_attention_topics=needs_attention,
        average_mastery=avg_mastery,
        open_misconceptions_count=open_misc_count,
        resolved_misconceptions_count=resolved_misc_count,
        misconceptions=misc_responses,
        topic_masteries=masteries,
    )

@router.get("/misconceptions", response_model=List[MisconceptionResponse])
def get_misconceptions(
    course_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Misconception).filter(Misconception.user_id == current_user.id)
    if course_id:
        query = query.filter(Misconception.course_id == course_id)
    if status:
        query = query.filter(Misconception.status == status)
    
    misconceptions = query.order_by(Misconception.created_at.desc()).all()
    
    # Map topic titles
    topics = db.query(Topic).all()
    topic_map = {t.id: t.title for t in topics}

    res = []
    for m in misconceptions:
        res.append(
            MisconceptionResponse(
                id=m.id,
                user_id=m.user_id,
                course_id=m.course_id,
                topic_id=m.topic_id,
                topic_title=topic_map.get(m.topic_id, "General"),
                title=m.title,
                description=m.description,
                evidence_question=m.evidence_question,
                evidence_answer=m.evidence_answer,
                expected_concept=m.expected_concept,
                confidence=m.confidence,
                remediation_provided=m.remediation_provided,
                status=m.status,
                next_review_at=m.next_review_at,
                attempt_count=m.attempt_count,
                last_assessed_outcome=m.last_assessed_outcome,
                resolved_at=m.resolved_at,
                created_at=m.created_at,
                updated_at=m.updated_at,
            )
        )
    return res

@router.get("/mastery", response_model=List[MasteryResponse])
def get_masteries(
    course_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    topic_query = db.query(Topic).join(Course, Topic.course_id == Course.id).filter(Course.user_id == current_user.id)
    if course_id:
        topic_query = topic_query.filter(Topic.course_id == course_id)
    topics = topic_query.all()

    masteries: List[MasteryResponse] = []
    for t in topics:
        m = (
            db.query(MasteryState)
            .filter(MasteryState.user_id == current_user.id, MasteryState.topic_id == t.id)
            .first()
        )
        masteries.append(
            MasteryResponse(
                id=m.id if m else f"virtual_{t.id}",
                topic_id=t.id,
                topic_title=t.title,
                course_id=t.course_id,
                mastery_score=m.mastery_score if m else 0.20,
                confidence_score=m.confidence_score if m else 0.10,
                evidence_count=m.evidence_count if m else 0,
                correct_count=m.correct_count if m else 0,
                total_count=m.total_count if m else 0,
                last_assessed_at=m.last_assessed_at if m else None,
                updated_at=m.updated_at if m else t.created_at,
            )
        )
    return masteries
