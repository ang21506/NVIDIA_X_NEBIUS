from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from backend.app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class AudioConversation(Base):
    __tablename__ = "audio_conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="J.A.R.V.I.S. Voice Study Session")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AudioMessage(Base):
    __tablename__ = "audio_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("audio_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(16), nullable=False)  # 'user' or 'assistant'
    transcript = Column(Text, nullable=False)
    audio_url = Column(String(512), nullable=True)  # URL/path to stored audio file
    duration_seconds = Column(Float, default=0.0)
    citations_json = Column(Text, default="[]")  # JSON list of citations
    created_at = Column(DateTime, default=datetime.utcnow)
