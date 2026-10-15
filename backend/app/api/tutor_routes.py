import os
import uuid
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.course import Course
from backend.app.models.audio_chat import AudioConversation, AudioMessage
from backend.app.schemas.tutor import (
    TutorQuestionRequest,
    TutorAnswerResponse,
    AudioConversationResponse,
    AudioMessageResponse,
    TutorCitation,
)
from backend.app.api.deps import get_current_user
from backend.app.services.tutor_service import TutorService
from backend.app.services.nebius_ai_service import NebiusAIService
from backend.app.config import settings

router = APIRouter(prefix="/v1/tutor", tags=["J.A.R.V.I.S. Voice Tutor"])

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
            conversation_id=payload.conversation_id,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voice/ask", response_model=TutorAnswerResponse)
async def ask_voice_tutor(
    course_id: str = Form(...),
    transcript: str = Form(""),
    conversation_id: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accepts speech input: audio file recording from user's microphone,
    saves the audio to persistent storage, queries course materials with J.A.R.V.I.S.,
    and returns voice synthesis text and metadata.
    """
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")

    user_audio_url = None
    if audio_file:
        file_ext = os.path.splitext(audio_file.filename)[1] or ".webm"
        safe_filename = f"user_{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(settings.AUDIO_DIR, safe_filename)
        with open(file_path, "wb") as f:
            while chunk := await audio_file.read(1024 * 512):
                f.write(chunk)
        user_audio_url = f"/v1/tutor/voice/audio/{safe_filename}"

    # If transcript is provided from browser SpeechRecognition or fallback
    question_text = transcript.strip() if transcript else "Analyze the current lecture concepts, J.A.R.V.I.S."

    response = TutorService.answer_question(
        db=db,
        user=current_user,
        course_id=course.id,
        question=question_text,
        conversation_id=conversation_id,
        user_audio_url=user_audio_url,
    )
    return response

@router.post("/voice/messages/{message_id}/audio")
async def save_assistant_audio(
    message_id: str,
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Persists the assistant's voice audio output in audio format for historical replay.
    """
    msg = db.query(AudioMessage).filter(AudioMessage.id == message_id, AudioMessage.user_id == current_user.id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Audio message not found")

    file_ext = os.path.splitext(audio_file.filename)[1] or ".webm"
    safe_filename = f"jarvis_{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.AUDIO_DIR, safe_filename)

    with open(file_path, "wb") as f:
        while chunk := await audio_file.read(1024 * 512):
            f.write(chunk)

    msg.audio_url = f"/v1/tutor/voice/audio/{safe_filename}"
    db.commit()
    return {"status": "saved", "audio_url": msg.audio_url}

@router.get("/voice/audio/{filename}")
def stream_audio_file(filename: str):
    """
    Streams saved user or J.A.R.V.I.S. voice audio recordings.
    """
    safe_name = os.path.basename(filename)
    file_path = os.path.join(settings.AUDIO_DIR, safe_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    media_type = "audio/webm" if filename.endswith(".webm") else "audio/wav" if filename.endswith(".wav") else "audio/mpeg"
    return FileResponse(file_path, media_type=media_type)

@router.get("/voice/conversations", response_model=List[AudioConversationResponse])
def list_voice_conversations(
    course_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists past voice study sessions just like ChatGPT conversation history.
    """
    query = db.query(AudioConversation).filter(AudioConversation.user_id == current_user.id)
    if course_id:
        query = query.filter(AudioConversation.course_id == course_id)

    convs = query.order_by(AudioConversation.updated_at.desc()).limit(30).all()
    res = []
    for c in convs:
        msg_count = db.query(AudioMessage).filter(AudioMessage.conversation_id == c.id).count()
        res.append(
            AudioConversationResponse(
                id=c.id,
                course_id=c.course_id,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=msg_count,
                messages=[],
            )
        )
    return res

@router.get("/voice/conversations/{id}", response_model=AudioConversationResponse)
def get_voice_conversation(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves full audio history for a conversation with audio clips and transcripts.
    """
    conv = db.query(AudioConversation).filter(AudioConversation.id == id, AudioConversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db_msgs = db.query(AudioMessage).filter(AudioMessage.conversation_id == conv.id).order_by(AudioMessage.created_at.asc()).all()

    messages = []
    for m in db_msgs:
        citations = []
        try:
            if m.citations_json:
                parsed_cites = json.loads(m.citations_json)
                citations = [TutorCitation(**c) for c in parsed_cites]
        except Exception:
            pass

        messages.append(
            AudioMessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                transcript=m.transcript,
                audio_url=m.audio_url,
                duration_seconds=m.duration_seconds,
                citations=citations,
                created_at=m.created_at,
            )
        )

    return AudioConversationResponse(
        id=conv.id,
        course_id=conv.course_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=len(messages),
        messages=messages,
    )

@router.get("/models")
def get_available_models(current_user: User = Depends(get_current_user)):
    models = NebiusAIService.list_available_models()
    return {
        "is_configured": NebiusAIService.is_configured(),
        "active_model": NebiusAIService.list_available_models()[0],
        "available_models": models,
    }
