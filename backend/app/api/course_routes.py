from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.course import Course
from backend.app.models.topic import Topic, TopicPrerequisite, MasteryState
from backend.app.models.resource import Resource
from backend.app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    CourseDetailResponse,
    TopicResponse,
)
from backend.app.api.deps import get_current_user, get_current_user_course
from backend.app.services.mastery_service import MasteryService

router = APIRouter(prefix="/v1/courses", tags=["Courses"])

@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = Course(
        user_id=current_user.id,
        title=payload.title,
        code=payload.code,
        description=payload.description,
        exam_date=payload.exam_date,
        learning_objectives=payload.learning_objectives,
        available_hours_per_week=payload.available_hours_per_week,
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    return CourseResponse(
        id=course.id,
        user_id=course.user_id,
        title=course.title,
        code=course.code,
        description=course.description,
        exam_date=course.exam_date,
        learning_objectives=course.learning_objectives,
        available_hours_per_week=course.available_hours_per_week,
        created_at=course.created_at,
        updated_at=course.updated_at,
        topic_count=0,
        resource_count=0,
        overall_mastery=0.0,
    )

@router.get("", response_model=List[CourseResponse])
def get_user_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    courses = (
        db.query(Course)
        .filter(Course.user_id == current_user.id)
        .order_by(Course.created_at.desc())
        .all()
    )
    res = []
    for c in courses:
        topic_count = db.query(Topic).filter(Topic.course_id == c.id).count()
        resource_count = db.query(Resource).filter(Resource.course_id == c.id).count()
        overview = MasteryService.get_course_mastery_overview(db, current_user.id, c.id)

        res.append(
            CourseResponse(
                id=c.id,
                user_id=c.user_id,
                title=c.title,
                code=c.code,
                description=c.description,
                exam_date=c.exam_date,
                learning_objectives=c.learning_objectives,
                available_hours_per_week=c.available_hours_per_week,
                created_at=c.created_at,
                updated_at=c.updated_at,
                topic_count=topic_count,
                resource_count=resource_count,
                overall_mastery=overview["overall_mastery"],
            )
        )
    return res

@router.get("/{id}", response_model=CourseDetailResponse)
def get_course_detail(
    course: Course = Depends(get_current_user_course),
    db: Session = Depends(get_db),
):
    topics = (
        db.query(Topic)
        .filter(Topic.course_id == course.id)
        .order_by(Topic.order_index.asc())
        .all()
    )
    topic_responses = []
    for t in topics:
        m = (
            db.query(MasteryState)
            .filter(MasteryState.user_id == course.user_id, MasteryState.topic_id == t.id)
            .first()
        )
        prereqs = (
            db.query(TopicPrerequisite)
            .filter(TopicPrerequisite.topic_id == t.id)
            .all()
        )
        topic_responses.append(
            TopicResponse(
                id=t.id,
                course_id=t.course_id,
                title=t.title,
                description=t.description,
                order_index=t.order_index,
                created_at=t.created_at,
                mastery_score=m.mastery_score if m else 0.20,
                prerequisites=[p.prerequisite_topic_id for p in prereqs],
            )
        )

    topic_count = len(topics)
    resource_count = db.query(Resource).filter(Resource.course_id == course.id).count()
    overview = MasteryService.get_course_mastery_overview(db, course.user_id, course.id)

    return CourseDetailResponse(
        id=course.id,
        user_id=course.user_id,
        title=course.title,
        code=course.code,
        description=course.description,
        exam_date=course.exam_date,
        learning_objectives=course.learning_objectives,
        available_hours_per_week=course.available_hours_per_week,
        created_at=course.created_at,
        updated_at=course.updated_at,
        topic_count=topic_count,
        resource_count=resource_count,
        overall_mastery=overview["overall_mastery"],
        topics=topic_responses,
    )

@router.patch("/{id}", response_model=CourseResponse)
def update_course(
    payload: CourseUpdate,
    course: Course = Depends(get_current_user_course),
    db: Session = Depends(get_db),
):
    if payload.title is not None:
        course.title = payload.title
    if payload.code is not None:
        course.code = payload.code
    if payload.description is not None:
        course.description = payload.description
    if payload.exam_date is not None:
        course.exam_date = payload.exam_date
    if payload.learning_objectives is not None:
        course.learning_objectives = payload.learning_objectives
    if payload.available_hours_per_week is not None:
        course.available_hours_per_week = payload.available_hours_per_week

    db.commit()
    db.refresh(course)

    topic_count = db.query(Topic).filter(Topic.course_id == course.id).count()
    resource_count = db.query(Resource).filter(Resource.course_id == course.id).count()
    overview = MasteryService.get_course_mastery_overview(db, course.user_id, course.id)

    return CourseResponse(
        id=course.id,
        user_id=course.user_id,
        title=course.title,
        code=course.code,
        description=course.description,
        exam_date=course.exam_date,
        learning_objectives=course.learning_objectives,
        available_hours_per_week=course.available_hours_per_week,
        created_at=course.created_at,
        updated_at=course.updated_at,
        topic_count=topic_count,
        resource_count=resource_count,
        overall_mastery=overview["overall_mastery"],
    )

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course: Course = Depends(get_current_user_course),
    db: Session = Depends(get_db),
):
    from backend.app.services.storage_service import StorageService
    for resource in db.query(Resource).filter(Resource.course_id == course.id, Resource.user_id == course.user_id):
        try:
            StorageService.delete(resource.file_path)
        except Exception:
            raise HTTPException(503, "Course files could not be deleted; retry later")
    db.delete(course)
    db.commit()
    return None
