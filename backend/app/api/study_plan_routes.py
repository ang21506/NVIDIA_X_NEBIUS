import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.course import Course
from backend.app.models.topic import Topic
from backend.app.models.planner import StudyTask
from backend.app.schemas.planner import (
    StudyTaskResponse,
    StudyTaskUpdate,
    RecalculatePlanRequest,
    StudyPlanResponse,
)
from backend.app.api.deps import get_current_user
from backend.app.services.planner_service import PlannerService

router = APIRouter(prefix="/v1", tags=["Study Planner"])

@router.get("/study-plans", response_model=StudyPlanResponse)
def get_study_plan(
    course_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not course_id:
        course = db.query(Course).filter(Course.user_id == current_user.id).order_by(Course.created_at.desc()).first()
        if not course:
            raise HTTPException(status_code=404, detail="No courses found for user.")
        course_id = course.id
    else:
        course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

    tasks = (
        db.query(StudyTask)
        .filter(StudyTask.user_id == current_user.id, StudyTask.course_id == course_id)
        .order_by(StudyTask.priority_score.desc(), StudyTask.due_date.asc())
        .all()
    )

    topics = db.query(Topic).filter(Topic.course_id == course_id).all()
    topic_map = {t.id: t.title for t in topics}

    task_responses: List[StudyTaskResponse] = []
    recommended_count = 0
    completed_count = 0

    for t in tasks:
        reasons = json.loads(t.reason_codes) if t.reason_codes else []
        if t.status == "COMPLETED":
            completed_count += 1
        else:
            recommended_count += 1

        task_responses.append(
            StudyTaskResponse(
                id=t.id,
                user_id=t.user_id,
                course_id=t.course_id,
                topic_id=t.topic_id,
                topic_title=topic_map.get(t.topic_id, "General Course Review"),
                title=t.title,
                description=t.description,
                due_date=t.due_date,
                estimated_minutes=t.estimated_minutes,
                priority_score=t.priority_score,
                reason_codes=reasons,
                status=t.status,
                completion_evidence=t.completion_evidence,
                completed_at=t.completed_at,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
        )

    formula_explanation = (
        "Priority = 0.35 × (1 − Topic Mastery) + 0.25 × Exam Urgency + "
        "0.20 × Forgetting Risk + 0.20 × Prerequisite Impact. "
        "Recalculated dynamically after every quiz attempt or misconception update."
    )

    return StudyPlanResponse(
        course_id=course.id,
        course_title=course.title,
        exam_date=course.exam_date,
        tasks=task_responses,
        formula_explanation=formula_explanation,
        recommended_count=recommended_count,
        completed_count=completed_count,
    )

@router.post("/study-plans/recalculate", response_model=StudyPlanResponse)
def recalculate_study_plan(
    payload: RecalculatePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == payload.course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    PlannerService.recalculate_course_plan(db, current_user.id, payload.course_id)
    return get_study_plan(course_id=payload.course_id, current_user=current_user, db=db)

@router.patch("/study-tasks/{task_id}", response_model=StudyTaskResponse)
def update_study_task(
    task_id: str,
    payload: StudyTaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(StudyTask).filter(StudyTask.id == task_id, StudyTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Study task not found")

    if payload.status is not None:
        task.status = payload.status
        if payload.status == "COMPLETED" and not task.completed_at:
            task.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            task.completion_evidence = payload.completion_evidence or "Manual confirmation by student"
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.completion_evidence is not None:
        task.completion_evidence = payload.completion_evidence

    task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(task)

    topic = db.query(Topic).filter(Topic.id == task.topic_id).first() if task.topic_id else None
    reasons = json.loads(task.reason_codes) if task.reason_codes else []

    return StudyTaskResponse(
        id=task.id,
        user_id=task.user_id,
        course_id=task.course_id,
        topic_id=task.topic_id,
        topic_title=topic.title if topic else "General Course Review",
        title=task.title,
        description=task.description,
        due_date=task.due_date,
        estimated_minutes=task.estimated_minutes,
        priority_score=task.priority_score,
        reason_codes=reasons,
        status=task.status,
        completion_evidence=task.completion_evidence,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )
