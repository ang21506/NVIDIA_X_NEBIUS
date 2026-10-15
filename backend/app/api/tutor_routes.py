from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.course import Course
from backend.app.schemas.tutor import TutorQuestionRequest, TutorAnswerResponse
from backend.app.api.deps import get_current_user
from backend.app.services.tutor_service import TutorService
from backend.app.services.nebius_ai_service import NebiusAIService

router = APIRouter(prefix="/v1/tutor", tags=["AI Tutor"])

@router.post("/ask", response_model=TutorAnswerResponse)
def ask_tutor(
    payload: TutorQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == payload.course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")

    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        response = TutorService.answer_question(
            db=db,
            user=current_user,
            course_id=course.id,
            question=payload.question,
            allow_general_knowledge=payload.allow_general_knowledge,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
def get_available_models(current_user: User = Depends(get_current_user)):
    """
    Returns available models from Nebius Token Factory and connection status.
    """
    models = NebiusAIService.list_available_models()
    return {
        "is_configured": NebiusAIService.is_configured(),
        "active_model": NebiusAIService.list_available_models()[0],
        "available_models": models,
    }
