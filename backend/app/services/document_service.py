import os
import json
import logging
from typing import List, Tuple
from pypdf import PdfReader
from sqlalchemy.orm import Session
from backend.app.models.resource import Resource, ResourceChunk
from backend.app.services.embedding_service import EmbeddingService
from backend.app.config import settings

logger = logging.getLogger(__name__)

class DocumentService:
    @staticmethod
    def chunk_text(text: str, chunk_size: int = 400, overlap: int = 60) -> List[str]:
        words = text.split()
        if not words:
            return []
        chunks = []
        start = 0
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk = " ".join(words[start:end])
            chunks.append(chunk)
            if end >= len(words):
                break
            start += (chunk_size - overlap)
        return chunks

    @classmethod
    def process_and_index_file(cls, db: Session, resource_id: str) -> bool:
        resource = db.query(Resource).filter(Resource.id == resource_id).first()
        if not resource:
            return False

        try:
            resource.status = "PROCESSING"
            db.commit()

            file_path = resource.file_path
            extracted_pages: List[Tuple[int, str]] = []

            if resource.filename.lower().endswith(".pdf"):
                reader = PdfReader(file_path)
                resource.page_count = len(reader.pages)
                for page_idx, page in enumerate(reader.pages, start=1):
                    page_text = page.extract_text() or ""
                    cleaned = " ".join(page_text.split())
                    if cleaned:
                        extracted_pages.append((page_idx, cleaned))
            else:
                # Text / Markdown file
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                cleaned = " ".join(content.split())
                extracted_pages.append((1, cleaned))
                resource.page_count = 1

            chunk_records = []
            global_chunk_idx = 0

            for page_num, page_text in extracted_pages:
                chunks = cls.chunk_text(page_text, chunk_size=settings.CHUNK_SIZE, overlap=settings.CHUNK_OVERLAP)
                for chunk_text in chunks:
                    if len(chunk_text.strip()) < 10:
                        continue
                    embedding = EmbeddingService.get_embedding(chunk_text)
                    chunk_records.append(
                        ResourceChunk(
                            resource_id=resource.id,
                            user_id=resource.user_id,
                            course_id=resource.course_id,
                            chunk_index=global_chunk_idx,
                            page_number=page_num,
                            content=chunk_text,
                            token_count=len(chunk_text.split()),
                            embedding_json=json.dumps(embedding),
                        )
                    )
                    global_chunk_idx += 1

            # Delete old chunks if any exist for re-indexing
            db.query(ResourceChunk).filter(ResourceChunk.resource_id == resource.id).delete()
            db.bulk_save_objects(chunk_records)
            
            resource.status = "INDEXED"
            resource.error_message = None
            db.commit()
            return True

        except Exception as e:
            logger.exception(f"Error processing resource {resource_id}: {e}")
            resource.status = "FAILED"
            resource.error_message = str(e)
            db.commit()
            return False

    @classmethod
    def search_chunks(
        cls, db: Session, user_id: str, course_id: str, query: str, top_k: int = 5
    ) -> List[dict]:
        """
        Retrieves relevant document chunks filtered strictly by user_id and course_id.
        """
        query_embedding = EmbeddingService.get_embedding(query)
        chunks = (
            db.query(ResourceChunk, Resource.filename)
            .join(Resource, ResourceChunk.resource_id == Resource.id)
            .filter(ResourceChunk.user_id == user_id, ResourceChunk.course_id == course_id)
            .all()
        )

        scored = []
        for chunk, filename in chunks:
            if not chunk.embedding_json:
                continue
            emb = json.loads(chunk.embedding_json)
            sim = EmbeddingService.cosine_similarity(query_embedding, emb)
            scored.append({
                "id": chunk.id,
                "resource_id": chunk.resource_id,
                "filename": filename,
                "page_number": chunk.page_number,
                "content": chunk.content,
                "similarity": round(sim, 4),
            })

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]

    @classmethod
    def delete_resource_and_chunks(cls, db: Session, resource: Resource) -> bool:
        """
        Deletes a resource file from disk and cascades chunk/embedding deletion.
        """
        try:
            if os.path.exists(resource.file_path):
                os.remove(resource.file_path)
        except Exception as e:
            logger.warning(f"Could not remove file on disk: {e}")

        db.query(ResourceChunk).filter(ResourceChunk.resource_id == resource.id).delete()
        db.delete(resource)
        db.commit()
        return True
