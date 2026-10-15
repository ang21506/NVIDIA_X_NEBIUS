from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field

class CourseBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    code: Optional[str] = None
    description: Optional[str] = None
    exam_date: Optional[date] = None
    learning_objectives: Optional[str] = None
    available_hours_per_week: int = 10

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    exam_date: Optional[date] = None
    learning_objectives: Optional[str] = None
    available_hours_per_week: Optional[int] = None

class TopicResponse(BaseModel):
    id: str
    course_id: str
    title: str
    description: Optional[str] = None
    order_index: int
    created_at: datetime
    mastery_score: Optional[float] = 0.2
    prerequisites: List[str] = []

    class Config:
        from_attributes = True

class CourseResponse(CourseBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    topic_count: int = 0
    resource_count: int = 0
    overall_mastery: float = 0.0

    class Config:
        from_attributes = True

class CourseDetailResponse(CourseResponse):
    topics: List[TopicResponse] = []
