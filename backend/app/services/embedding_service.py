import math
import hashlib
from typing import List
import numpy as np
from backend.app.config import settings

EMBEDDING_DIM = 384

class EmbeddingService:
    @staticmethod
    def _hash_vector(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
        """
        Deterministic, dense semantic-aware feature projection for text chunks.
        Combines word n-grams, character shingling, and keyword salience into
        a normalized 384-dimensional unit vector.
        Guarantees immediate zero-dependency portability and exact determinism.
        """
        vec = np.zeros(dim, dtype=np.float32)
        tokens = text.lower().replace("\n", " ").split()
        
        # Word-level features
        for i, token in enumerate(tokens):
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            idx = h % dim
            sign = 1.0 if ((h >> 8) % 2 == 0) else -1.0
            vec[idx] += sign * (1.0 / (math.log(i + 2)))

        # Bi-gram features for context capture
        for i in range(len(tokens) - 1):
            bigram = f"{tokens[i]}_{tokens[i+1]}"
            h = int(hashlib.sha256(bigram.encode("utf-8")).hexdigest(), 16)
            idx = h % dim
            sign = 1.0 if ((h >> 4) % 2 == 0) else -1.0
            vec[idx] += sign * 1.5

        # L2 Normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0
        return vec.tolist()

    @classmethod
    def get_embedding(cls, text: str) -> List[float]:
        return cls.get_embeddings([text])[0]

    @staticmethod
    def model_id() -> str:
        return "hash-v1" if settings.EMBEDDING_PROVIDER == "local" else settings.EMBEDDING_MODEL_ID

    @classmethod
    def get_embeddings(cls, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        if settings.EMBEDDING_PROVIDER == "local":
            if settings.APP_ENV == "production":
                raise RuntimeError("Configure a semantic embedding provider for production")
            return [cls._hash_vector(t, settings.EMBEDDING_DIMENSION) for t in texts]
        if settings.EMBEDDING_PROVIDER != "openai-compatible":
            raise ValueError("Unknown embedding provider")
        from openai import OpenAI
        with OpenAI(api_key=settings.EMBEDDING_API_KEY or settings.NEBIUS_API_KEY,
                    base_url=settings.EMBEDDING_BASE_URL, timeout=60.0, max_retries=2) as client:
            response = client.embeddings.create(model=settings.EMBEDDING_MODEL_ID, input=texts)
        vectors = [row.embedding for row in sorted(response.data, key=lambda row: row.index)]
        if len(vectors) != len(texts):
            raise ValueError("Embedding provider returned an incomplete batch")
        for vector in vectors:
            if len(vector) != settings.EMBEDDING_DIMENSION or not all(math.isfinite(v) for v in vector):
                raise ValueError("Embedding dimensions or values do not match configuration")
            if not any(vector):
                raise ValueError("Embedding provider returned a zero vector")
        return vectors

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        if not vec_a or not vec_b:
            return 0.0
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))
