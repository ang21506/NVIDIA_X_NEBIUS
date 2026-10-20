import os
import json
import logging
import io
from typing import List, Tuple
from pypdf import PdfReader
from sqlalchemy.orm import Session
from sqlalchemy import cast, Float
from pgvector.sqlalchemy import Vector
from backend.app.models.resource import Resource, ResourceChunk
from backend.app.services.embedding_service import EmbeddingService
from backend.app.config import settings
from backend.app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

class DocumentService:
    @staticmethod
    def chunk_text(text: str, chunk_size: int = 400, overlap: int = 60) -> List[str]:
        if not 0 <= overlap < chunk_size:
            raise ValueError("Chunk overlap must be smaller than a positive chunk size")
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
            file_data = StorageService.read(file_path)
            extracted_pages: List[Tuple[int, str]] = []

            if resource.filename.lower().endswith(".pdf"):
                reader = PdfReader(io.BytesIO(file_data))
                resource.page_count = len(reader.pages)
                for page_idx, page in enumerate(reader.pages, start=1):
                    page_text = page.extract_text() or ""
                    cleaned = " ".join(page_text.split())
                    if cleaned:
                        extracted_pages.append((page_idx, cleaned))
            else:
                # Text / Markdown file
                content = file_data.decode("utf-8", errors="replace")
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
                            embedding=embedding,
                            embedding_model=EmbeddingService.model_id(),
                            embedding_dimension=len(embedding),
                        )
                    )
                    global_chunk_idx += 1

            # Delete old chunks if any exist for re-indexing
            if not chunk_records:
                raise ValueError("No readable text found. Scanned documents need OCR before indexing.")
            db.query(ResourceChunk).filter(ResourceChunk.resource_id == resource.id).delete()
            db.bulk_save_objects(chunk_records)
            
            resource.status = "INDEXED"
            resource.error_message = None
            db.commit()
            return True

        except Exception as e:
            logger.exception(f"Error processing resource {resource_id}: {e}")
            db.rollback()
            resource.status = "FAILED"
            resource.error_message = "Document indexing failed. Check the file and embedding configuration."
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
        chunk_query = (
            db.query(ResourceChunk, Resource.filename)
            .join(Resource, ResourceChunk.resource_id == Resource.id)
            .filter(ResourceChunk.user_id == user_id, ResourceChunk.course_id == course_id,
                    Resource.user_id == user_id, Resource.course_id == course_id,
                    Resource.status == "INDEXED",
                    ResourceChunk.embedding_model == EmbeddingService.model_id(),
                    ResourceChunk.embedding_dimension == len(query_embedding))
        )

        if db.get_bind().dialect.name == "postgresql":
            distance = ResourceChunk.embedding.op("<=>", return_type=Float)(cast(query_embedding, Vector()))
            rows = (chunk_query.filter(ResourceChunk.embedding.is_not(None))
                    .add_columns(distance.label("distance"))
                    .order_by(distance).limit(top_k).all())
            return [{"id": c.id, "resource_id": c.resource_id, "filename": name,
                     "page_number": c.page_number, "content": c.content,
                     "similarity": round(1 - float(d), 4)} for c, name, d in rows]

        chunks = chunk_query.all()

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
        # Keep the record if object deletion fails, so the operation can be retried.
        StorageService.delete(resource.file_path)

        db.query(ResourceChunk).filter(ResourceChunk.resource_id == resource.id).delete()
        db.delete(resource)
        db.commit()
        return True
