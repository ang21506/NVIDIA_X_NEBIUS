import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.course import Course
from backend.app.models.resource import Resource, ResourceChunk
from backend.app.schemas.resource import ResourceResponse, ResourceChunkResponse
from backend.app.api.deps import get_current_user
from backend.app.services.document_service import DocumentService
from backend.app.config import settings

router = APIRouter(prefix="/v1", tags=["Resources"])

@router.post("/resources/upload", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_resource(
    course_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify course ownership
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")

    # File type validation
    allowed_extensions = [".pdf", ".txt", ".md"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file_ext}'. Allowed formats: PDF, TXT, MD."
        )

    # Secure local save
    safe_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    file_size = 0
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            file_size += len(chunk)
            if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
                os.remove(file_path)
                raise HTTPException(
                    status_code=400,
                    detail=f"File exceeds maximum upload size of {settings.MAX_UPLOAD_SIZE_MB}MB."
                )
            buffer.write(chunk)

    resource = Resource(
        user_id=current_user.id,
        course_id=course.id,
        filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        status="UPLOADED",
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)

    # Process and index immediately in pipeline
    DocumentService.process_and_index_file(db, resource.id)
    db.refresh(resource)

    chunk_count = db.query(ResourceChunk).filter(ResourceChunk.resource_id == resource.id).count()

    return ResourceResponse(
        id=resource.id,
        user_id=resource.user_id,
        course_id=resource.course_id,
        filename=resource.filename,
        file_size=resource.file_size,
        mime_type=resource.mime_type,
        page_count=resource.page_count,
        status=resource.status,
        error_message=resource.error_message,
        created_at=resource.created_at,
        updated_at=resource.updated_at,
        chunk_count=chunk_count,
    )

@router.get("/courses/{course_id}/resources", response_model=List[ResourceResponse])
def get_course_resources(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    resources = (
        db.query(Resource)
        .filter(Resource.course_id == course_id, Resource.user_id == current_user.id)
        .order_by(Resource.created_at.desc())
        .all()
    )

    res = []
    for r in resources:
        chunk_count = db.query(ResourceChunk).filter(ResourceChunk.resource_id == r.id).count()
        res.append(
            ResourceResponse(
                id=r.id,
                user_id=r.user_id,
                course_id=r.course_id,
                filename=r.filename,
                file_size=r.file_size,
                mime_type=r.mime_type,
                page_count=r.page_count,
                status=r.status,
                error_message=r.error_message,
                created_at=r.created_at,
                updated_at=r.updated_at,
                chunk_count=chunk_count,
            )
        )
    return res

@router.get("/resources/{id}", response_model=ResourceResponse)
def get_resource(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == id, Resource.user_id == current_user.id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    chunk_count = db.query(ResourceChunk).filter(ResourceChunk.resource_id == resource.id).count()
    return ResourceResponse(
        id=resource.id,
        user_id=resource.user_id,
        course_id=resource.course_id,
        filename=resource.filename,
        file_size=resource.file_size,
        mime_type=resource.mime_type,
        page_count=resource.page_count,
        status=resource.status,
        error_message=resource.error_message,
        created_at=resource.created_at,
        updated_at=resource.updated_at,
        chunk_count=chunk_count,
    )

@router.delete("/resources/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == id, Resource.user_id == current_user.id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    DocumentService.delete_resource_and_chunks(db, resource)
    return None
