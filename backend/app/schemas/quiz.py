from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class QuizGenerateRequest(BaseModel):
    course_id: str
    topic_ids: Optional[List[str]] = None
    num_questions: int = 5
    difficulty: str = "medium"
    include_retest_misconceptions: bool = True

class QuizItemSchema(BaseModel):
    id: str
    topic_id: str
    question: str
    options: List[str]
    difficulty: str

class QuizDetailSchema(QuizItemSchema):
    correct_answer: str
    explanation: str

class QuizSubmitAnswer(BaseModel):
    quiz_item_id: str
    selected_answer: str

class QuizSubmitRequest(BaseModel):
    course_id: str
    answers: List[QuizSubmitAnswer]
    idempotency_key: Optional[str] = Field(default=None, min_length=8, max_length=128)

class QuizAnswerResult(BaseModel):
    quiz_item_id: str
    question: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str
    detected_misconception: Optional[str] = None
    evidence_quote: Optional[str] = None

class QuizResultResponse(BaseModel):
    attempt_id: str
    course_id: str
    total_items: int
    correct_items: int
    score_percentage: float
    answers: List[QuizAnswerResult]
    detected_misconceptions: List[dict] = []
    updated_mastery: Dict[str, float] = {}
    planner_updated: bool = True

class QuizAttemptResponse(BaseModel):
    id: str
    course_id: str
    total_items: int
    correct_items: int
    score_percentage: float
    created_at: Optional[str] = None

