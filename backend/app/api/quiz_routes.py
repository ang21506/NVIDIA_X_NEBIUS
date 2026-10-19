import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.course import Course
from backend.app.models.assessment import QuizItem, QuizAttempt, QuizAnswer
from backend.app.schemas.quiz import (
    QuizGenerateRequest,
    QuizItemSchema,
    QuizSubmitRequest,
    QuizResultResponse,
    QuizAnswerResult,
    QuizAttemptResponse,
)
from backend.app.api.deps import get_current_user
from backend.app.services.quiz_service import QuizService

router = APIRouter(prefix="/v1/quizzes", tags=["Quizzes"])

@router.post("/generate", response_model=List[QuizItemSchema])
def generate_quiz(
    payload: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == payload.course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")

    items = QuizService.get_or_generate_quiz_items(
        db=db,
        user_id=current_user.id,
        course_id=payload.course_id,
        topic_ids=payload.topic_ids,
        num_questions=payload.num_questions,
        difficulty=payload.difficulty,
    )

    if not items:
        raise HTTPException(
            status_code=400,
            detail="No quiz questions available for this course yet. Please seed course items or ingest study notes."
        )

    res = []
    for item in items:
        opts = json.loads(item.options_json) if item.options_json else []
        res.append(
            QuizItemSchema(
                id=item.id,
                topic_id=item.topic_id,
                question=item.question,
                options=opts,
                difficulty=item.difficulty or "medium",
            )
        )
    return res

@router.post("/submit", response_model=QuizResultResponse)
def submit_quiz(
    payload: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == payload.course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")

    if not payload.answers:
        raise HTTPException(status_code=400, detail="No answers provided in quiz submission.")

    return QuizService.submit_and_score_quiz(db, current_user.id, payload)

@router.get("/{attempt_id}/results", response_model=QuizResultResponse)
def get_quiz_results(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")

    answers = db.query(QuizAnswer).filter(QuizAnswer.attempt_id == attempt.id).all()
    answer_results = []
    for a in answers:
        item = db.query(QuizItem).filter(QuizItem.id == a.quiz_item_id).first()
        answer_results.append(
            QuizAnswerResult(
                quiz_item_id=a.quiz_item_id,
                question=item.question if item else "Question",
                selected_answer=a.selected_answer,
                correct_answer=item.correct_answer if item else "",
                is_correct=a.is_correct,
                explanation=item.explanation if item else "",
                detected_misconception=a.detected_misconception,
                evidence_quote=a.evidence_quote,
            )
        )

    return QuizResultResponse(
        attempt_id=attempt.id,
        course_id=attempt.course_id,
        total_items=attempt.total_items,
        correct_items=attempt.correct_items,
        score_percentage=attempt.score_percentage,
        answers=answer_results,
        detected_misconceptions=[],
        updated_mastery={},
        planner_updated=False,
    )

@router.get("/attempts", response_model=List[QuizAttemptResponse])
def list_quiz_attempts(
    course_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id)
    if course_id:
        query = query.filter(QuizAttempt.course_id == course_id)
    attempts = query.order_by(QuizAttempt.created_at.asc()).all()
    return [
        QuizAttemptResponse(
            id=a.id,
            course_id=a.course_id,
            total_items=a.total_items,
            correct_items=a.correct_items,
            score_percentage=a.score_percentage,
            created_at=a.created_at.isoformat() if a.created_at else None,
        )
        for a in attempts
    ]

