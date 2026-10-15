import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.agent import AgentRun, ToolGrant
from backend.app.schemas.agent import (
    AgentRunRequest,
    AgentRunResponse,
    ToolGrantResponse,
    ToolGrantToggle,
)
from backend.app.api.deps import get_current_user
from backend.app.services.agent_orchestrator import AgentOrchestrator

router = APIRouter(prefix="/v1", tags=["Agent Activity"])

DEFAULT_TOOLS = [
    ("ingest_material", "Allows the agent to process, extract text, chunk, and index uploaded documents."),
    ("retrieve_and_teach", "Allows the agent to retrieve course document passages and synthesize evidence-backed answers."),
    ("diagnose_gap", "Allows the agent to analyze quiz errors and detect conceptual misconceptions."),
    ("replan_study", "Allows the agent to autonomously recalculate study task priorities."),
    ("daily_study_brief", "Allows the agent to compile high-urgency tasks into a daily summary."),
    ("confirm_progress", "Allows the agent to verify task completion based on recorded learning events."),
]

@router.post("/agent-runs", response_model=AgentRunResponse)
def trigger_agent_run(
    payload: AgentRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = AgentOrchestrator.run_skill(
        db=db,
        user=current_user,
        skill_name=payload.skill_name,
        goal=payload.goal,
        course_id=payload.course_id,
        params=payload.params or {},
    )

    tools = json.loads(run.tool_actions) if run.tool_actions else []
    logs = json.loads(run.logs) if run.logs else []

    return AgentRunResponse(
        id=run.id,
        user_id=run.user_id,
        course_id=run.course_id,
        goal=run.goal,
        skill_name=run.skill_name,
        execution_state=run.execution_state,
        tool_actions=tools,
        logs=logs,
        result_summary=run.result_summary,
        error_message=run.error_message,
        started_at=run.started_at,
        completed_at=run.completed_at,
    )

@router.get("/agent-runs", response_model=List[AgentRunResponse])
def get_agent_runs(
    course_id: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(AgentRun).filter(AgentRun.user_id == current_user.id)
    if course_id:
        query = query.filter(AgentRun.course_id == course_id)
    if skill:
        query = query.filter(AgentRun.skill_name == skill)
    if status:
        query = query.filter(AgentRun.execution_state == status)

    runs = query.order_by(AgentRun.started_at.desc()).limit(50).all()
    res = []
    for r in runs:
        tools = json.loads(r.tool_actions) if r.tool_actions else []
        logs = json.loads(r.logs) if r.logs else []
        res.append(
            AgentRunResponse(
                id=r.id,
                user_id=r.user_id,
                course_id=r.course_id,
                goal=r.goal,
                skill_name=r.skill_name,
                execution_state=r.execution_state,
                tool_actions=tools,
                logs=logs,
                result_summary=r.result_summary,
                error_message=r.error_message,
                started_at=r.started_at,
                completed_at=r.completed_at,
            )
        )
    return res

@router.get("/agent-runs/{id}", response_model=AgentRunResponse)
def get_agent_run_detail(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(AgentRun).filter(AgentRun.id == id, AgentRun.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Agent run not found")

    tools = json.loads(r.tool_actions) if r.tool_actions else []
    logs = json.loads(r.logs) if r.logs else []

    return AgentRunResponse(
        id=r.id,
        user_id=r.user_id,
        course_id=r.course_id,
        goal=r.goal,
        skill_name=r.skill_name,
        execution_state=r.execution_state,
        tool_actions=tools,
        logs=logs,
        result_summary=r.result_summary,
        error_message=r.error_message,
        started_at=r.started_at,
        completed_at=r.completed_at,
    )

@router.get("/agent/grants", response_model=List[ToolGrantResponse])
def get_tool_grants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    grants = db.query(ToolGrant).filter(ToolGrant.user_id == current_user.id).all()
    grant_map = {g.tool_name: g for g in grants}

    res = []
    for tool_name, desc in DEFAULT_TOOLS:
        g = grant_map.get(tool_name)
        res.append(
            ToolGrantResponse(
                id=g.id if g else f"virtual_{tool_name}",
                tool_name=tool_name,
                is_granted=g.is_granted if g else True,
                revoked_at=g.revoked_at if g else None,
                description=desc,
            )
        )
    return res

@router.post("/agent/grants", response_model=ToolGrantResponse)
def toggle_tool_grant(
    payload: ToolGrantToggle,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    grant = (
        db.query(ToolGrant)
        .filter(ToolGrant.user_id == current_user.id, ToolGrant.tool_name == payload.tool_name)
        .first()
    )
    if not grant:
        grant = ToolGrant(
            user_id=current_user.id,
            tool_name=payload.tool_name,
            is_granted=payload.is_granted,
            revoked_at=None if payload.is_granted else datetime.utcnow(),
        )
        db.add(grant)
    else:
        grant.is_granted = payload.is_granted
        grant.revoked_at = None if payload.is_granted else datetime.utcnow()
        grant.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(grant)

    desc_map = dict(DEFAULT_TOOLS)
    return ToolGrantResponse(
        id=grant.id,
        tool_name=grant.tool_name,
        is_granted=grant.is_granted,
        revoked_at=grant.revoked_at,
        description=desc_map.get(grant.tool_name),
    )
