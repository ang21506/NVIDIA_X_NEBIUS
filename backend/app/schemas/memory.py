from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class MisconceptionResponse(BaseModel):
    id: str
    user_id: str
    course_id: str
    topic_id: str
    topic_title: Optional[str] = None
    title: str
    description: str
    evidence_question: str
    evidence_answer: str
    expected_concept: str
    confidence: float
    remediation_provided: Optional[str] = None
    status: str
    next_review_at: Optional[datetime] = None
    attempt_count: int
    last_assessed_outcome: str
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MasteryResponse(BaseModel):
    id: str
    topic_id: str
    topic_title: str
    course_id: str
    mastery_score: float
    confidence_score: float
    evidence_count: int
    correct_count: int
    total_count: int
    last_assessed_at: Optional[datetime] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class MemorySummaryResponse(BaseModel):
    total_topics: int
    mastered_topics: int
    in_progress_topics: int
    needs_attention_topics: int
    average_mastery: float
    open_misconceptions_count: int
    resolved_misconceptions_count: int
    misconceptions: List[MisconceptionResponse] = []
    topic_masteries: List[MasteryResponse] = []
