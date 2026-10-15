from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class AgentRunRequest(BaseModel):
    goal: str
    skill_name: str
    course_id: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

class AgentRunResponse(BaseModel):
    id: str
    user_id: str
    course_id: Optional[str] = None
    goal: str
    skill_name: str
    execution_state: str
    tool_actions: List[Dict[str, Any]] = []
    logs: List[str] = []
    result_summary: Optional[str] = None
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ToolGrantResponse(BaseModel):
    id: str
    tool_name: str
    is_granted: bool
    revoked_at: Optional[datetime] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True

class ToolGrantToggle(BaseModel):
    tool_name: str
    is_granted: bool
