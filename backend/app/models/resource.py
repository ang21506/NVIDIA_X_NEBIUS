from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from backend.app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Resource(Base):
    __tablename__ = "resources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(128), default="application/pdf")
    page_count = Column(Integer, default=0)
    # Status: UPLOADED, PROCESSING, INDEXED, FAILED
    status = Column(String(32), default="UPLOADED", nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ResourceChunk(Base):
    __tablename__ = "resource_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    resource_id = Column(String(36), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, default=1, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0)
    embedding_json = Column(Text, nullable=True)  # JSON-serialized list of floats
    created_at = Column(DateTime, default=datetime.utcnow)
