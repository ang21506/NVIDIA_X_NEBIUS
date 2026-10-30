from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.course import Course
from backend.app.models.resource import Resource, ResourceChunk
from backend.app.models.topic import Topic, MasteryState
from backend.app.models.assessment import QuizItem, QuizAttempt, QuizAnswer
from backend.app.models.misconception import Misconception
from backend.app.models.planner import StudyTask
from backend.app.models.agent import AgentRun, ToolGrant
from backend.app.models.learning_event import MasteryEvent
from backend.app.models.audio_chat import AudioConversation, AudioMessage
from backend.app.api.deps import get_current_user
from backend.app.services.seed_service import SeedService
from backend.app.config import settings

router = APIRouter(prefix="/v1/settings", tags=["Settings & Privacy"])

class PrivacyInfoResponse(BaseModel):
    model_provider: str
    model_id: str
    disclosure: str
    storage_type: str
    retention_policy: str
    export_available: bool = True
    full_deletion_supported: bool = False

@router.get("/privacy", response_model=PrivacyInfoResponse)
def get_privacy_info(current_user: User = Depends(get_current_user)):
    return PrivacyInfoResponse(
        model_provider="NVIDIA Nemotron via Nebius Token Factory",
        model_id=settings.NEBIUS_MODEL_ID,
        disclosure=(
            "When live inference is enabled, questions and selected document excerpts are sent "
            "to the configured model provider. Learning records are stored in the application "
            "database. Provider processing and retention depend on your deployment agreement."
        ),
        storage_type="Application database with user-scoped document retrieval",
        retention_policy="Learning-data reset preserves your account and course files. Backup retention depends on deployment settings.",
        export_available=True,
        full_deletion_supported=False,
    )

@router.post("/export")
def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Exports full user learner profile, courses, documents, misconceptions, and history.
    """
    courses = db.query(Course).filter(Course.user_id == current_user.id).all()
    resources = db.query(Resource).filter(Resource.user_id == current_user.id).all()
    misconceptions = db.query(Misconception).filter(Misconception.user_id == current_user.id).all()
    masteries = db.query(MasteryState).filter(MasteryState.user_id == current_user.id).all()
    tasks = db.query(StudyTask).filter(StudyTask.user_id == current_user.id).all()
    runs = db.query(AgentRun).filter(AgentRun.user_id == current_user.id).all()
    # Explicit exclusions prevent authentication material and internal storage
    # locations from becoming part of a downloadable export.
    def records(model):
        excluded = {"hashed_password", "file_path", "embedding", "embedding_json"}
        rows = db.query(model).filter(model.user_id == current_user.id).all()
        return [{column.name: getattr(row, column.name) for column in model.__table__.columns
                 if column.name not in excluded} for row in rows]

    return {
        "export_metadata": {
            "user_id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "exported_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
            "version": "1.0",
        },
        "courses": [{"id": c.id, "title": c.title, "code": c.code, "exam_date": str(c.exam_date)} for c in courses],
        "resources": [{"id": r.id, "filename": r.filename, "status": r.status, "page_count": r.page_count} for r in resources],
        "misconceptions": [
            {
                "id": m.id,
                "title": m.title,
                "status": m.status,
                "expected_concept": m.expected_concept,
                "confidence": m.confidence,
                "attempt_count": m.attempt_count,
            }
            for m in misconceptions
        ],
        "mastery_states": [
            {
                "topic_id": m.topic_id,
                "mastery_score": m.mastery_score,
                "evidence_count": m.evidence_count,
            }
            for m in masteries
        ],
        "study_tasks": [{"id": t.id, "title": t.title, "priority_score": t.priority_score, "status": t.status} for t in tasks],
        "agent_runs": [{"id": r.id, "goal": r.goal, "skill": r.skill_name, "state": r.execution_state} for r in runs],
        "topics": records(Topic),
        "resource_chunks": records(ResourceChunk),
        "quiz_items": records(QuizItem),
        "quiz_attempts": records(QuizAttempt),
        "quiz_answers": records(QuizAnswer),
        "mastery_events": records(MasteryEvent),
        "conversations": records(AudioConversation),
        "messages": records(AudioMessage),
        "tool_grants": records(ToolGrant),
    }

@router.delete("/data", status_code=status.HTTP_200_OK)
def delete_user_learning_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Purges learning memory: misconceptions, quiz attempts, answers, and study tasks.
    Preserves course enrollment and user account.
    """
    db.query(MasteryEvent).filter(MasteryEvent.user_id == current_user.id).delete()
    db.query(Misconception).filter(Misconception.user_id == current_user.id).delete()
    db.query(QuizAnswer).filter(QuizAnswer.user_id == current_user.id).delete()
    db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).delete()
    db.query(StudyTask).filter(StudyTask.user_id == current_user.id).delete()
    db.query(AgentRun).filter(AgentRun.user_id == current_user.id).delete()
    
    # Reset mastery scores to baseline 0.20
    masteries = db.query(MasteryState).filter(MasteryState.user_id == current_user.id).all()
    for m in masteries:
        m.mastery_score = 0.20
        m.confidence_score = 0.10
        m.evidence_count = 0
        m.correct_count = 0
        m.total_count = 0

    db.commit()
    return {"message": "All learner memory, misconceptions, and history have been purged successfully."}

@router.post("/reset-demo")
def reset_demo_state(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Clears any demo modifications and resets Machine Learning Fundamentals baseline.
    """
    if settings.APP_ENV == "production" or not settings.ENABLE_DEMO_MODE or not current_user.is_demo:
        raise HTTPException(403, "Demo reset is only available to development demo accounts")
    delete_user_learning_data(current_user=current_user, db=db)
    SeedService.seed_demo_data(db)
    return {"message": "Demo course and baseline state re-initialized successfully."}
