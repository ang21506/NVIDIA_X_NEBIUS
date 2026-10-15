from datetime import datetime
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, UniqueConstraint
from backend.app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True, index=True)
    goal = Column(String(512), nullable=False)
    skill_name = Column(String(64), nullable=False, index=True)
    
    # REQUESTED -> AUTHORIZED -> CONTEXT_LOADED -> PLANNED -> TOOL_EXECUTED -> VERIFIED -> MEMORY_UPDATED -> COMPLETED
    execution_state = Column(String(32), default="REQUESTED", nullable=False, index=True)
    tool_actions = Column(Text, default="[]")  # JSON list of sanitized action executions
    logs = Column(Text, default="[]")  # JSON list of timestamps & state notes
    result_summary = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class ToolGrant(Base):
    __tablename__ = "tool_grants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_name = Column(String(64), nullable=False)
    is_granted = Column(Boolean, default=True, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "tool_name", name="uq_user_tool_grant"),
    )
