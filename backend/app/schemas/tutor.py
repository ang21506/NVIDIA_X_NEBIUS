from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class TutorQuestionRequest(BaseModel):
    course_id: str
    question: str
    topic_id: Optional[str] = None
    allow_general_knowledge: bool = False
    conversation_id: Optional[str] = None

class TutorCitation(BaseModel):
    resource_id: str
    filename: str
    page_number: int
    excerpt: str
    relevance_score: float

class TutorAnswerResponse(BaseModel):
    answer: str
    speech_text: Optional[str] = None
    key_takeaways: List[str] = []
    examples: List[str] = []
    citations: List[TutorCitation] = []
    has_sufficient_evidence: bool = True
    uncertainty_notes: Optional[str] = None
    follow_up_questions: List[str] = []
    model_used: str
    latency_ms: Optional[float] = None
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    user_audio_url: Optional[str] = None
    assistant_audio_url: Optional[str] = None

class AudioMessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    transcript: str
    audio_url: Optional[str] = None
    duration_seconds: float = 0.0
    citations: List[TutorCitation] = []
    created_at: datetime

    class Config:
        from_attributes = True

class AudioConversationResponse(BaseModel):
    id: str
    course_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    messages: List[AudioMessageResponse] = []

    class Config:
        from_attributes = True
