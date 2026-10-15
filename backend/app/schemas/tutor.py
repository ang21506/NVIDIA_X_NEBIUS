from typing import List, Optional
from pydantic import BaseModel

class TutorQuestionRequest(BaseModel):
    course_id: str
    question: str
    topic_id: Optional[str] = None
    allow_general_knowledge: bool = False

class TutorCitation(BaseModel):
    resource_id: str
    filename: str
    page_number: int
    excerpt: str
    relevance_score: float

class TutorAnswerResponse(BaseModel):
    answer: str
    key_takeaways: List[str] = []
    examples: List[str] = []
    citations: List[TutorCitation] = []
    has_sufficient_evidence: bool = True
    uncertainty_notes: Optional[str] = None
    follow_up_questions: List[str] = []
    model_used: str
    latency_ms: Optional[float] = None
