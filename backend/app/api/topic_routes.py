from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.course import Course
from backend.app.models.topic import Topic, TopicPrerequisite, MasteryState
from backend.app.schemas.course import TopicResponse
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/v1", tags=["Topics"])

class TopicCreateRequest(BaseModel):
    title: str
    description: str = ""
    order_index: int = 0
    prerequisites: List[str] = []

@router.get("/courses/{course_id}/topics", response_model=List[TopicResponse])
def get_course_topics(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    topics = db.query(Topic).filter(Topic.course_id == course_id).order_by(Topic.order_index.asc()).all()
    res = []
    for t in topics:
        m = db.query(MasteryState).filter(MasteryState.user_id == current_user.id, MasteryState.topic_id == t.id).first()
        prereqs = db.query(TopicPrerequisite).filter(TopicPrerequisite.topic_id == t.id).all()
        res.append(
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
    return res

@router.post("/courses/{course_id}/topics", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def create_course_topic(
    course_id: str,
    payload: TopicCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    topic = Topic(
        course_id=course_id,
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        order_index=payload.order_index,
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)

    for p_id in payload.prerequisites:
        # Prevent self prerequisite
        if p_id != topic.id:
            db.add(TopicPrerequisite(topic_id=topic.id, prerequisite_topic_id=p_id))
    db.commit()

    return TopicResponse(
        id=topic.id,
        course_id=topic.course_id,
        title=topic.title,
        description=topic.description,
        order_index=topic.order_index,
        created_at=topic.created_at,
        mastery_score=0.20,
        prerequisites=payload.prerequisites,
    )
