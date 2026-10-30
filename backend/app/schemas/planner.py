from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class StudyTaskResponse(BaseModel):
    id: str
    user_id: str
    course_id: str
    topic_id: Optional[str] = None
    topic_title: Optional[str] = None
    title: str
    description: str
    due_date: date
    estimated_minutes: int
    priority_score: float
    reason_codes: List[str]
    status: str
    completion_evidence: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StudyTaskUpdate(BaseModel):
    status: Optional[str] = None
    due_date: Optional[date] = None
    completion_evidence: Optional[str] = None

class RecalculatePlanRequest(BaseModel):
    course_id: str

class StudyPlanResponse(BaseModel):
    course_id: str
    course_title: str
    exam_date: Optional[date] = None
    tasks: List[StudyTaskResponse]
    formula_explanation: str
    recommended_count: int
    completed_count: int
