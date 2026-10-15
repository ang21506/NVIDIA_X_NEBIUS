from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class ResourceResponse(BaseModel):
    id: str
    user_id: str
    course_id: str
    filename: str
    file_size: int
    mime_type: str
    page_count: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    chunk_count: int = 0

    class Config:
        from_attributes = True

class ResourceChunkResponse(BaseModel):
    id: str
    resource_id: str
    chunk_index: int
    page_number: int
    content: str
    token_count: int

    class Config:
        from_attributes = True

class SearchResultChunk(BaseModel):
    id: str
    resource_id: str
    filename: str
    page_number: int
    content: str
    similarity: float
