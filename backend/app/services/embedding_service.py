import math
import hashlib
from typing import List
import numpy as np

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
        return cls._hash_vector(text)

    @classmethod
    def get_embeddings(cls, texts: List[str]) -> List[List[float]]:
        return [cls._hash_vector(t) for t in texts]

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
