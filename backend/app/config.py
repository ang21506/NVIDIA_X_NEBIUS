import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "LearnLoop AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./backend/data/learnloop.db")

    # Nebius Token Factory / NVIDIA Nemotron
    NEBIUS_API_KEY: str = os.getenv("NEBIUS_API_KEY", "")
    NEBIUS_BASE_URL: str = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1/")
    NEBIUS_MODEL_ID: str = os.getenv("NEBIUS_MODEL_ID", "nvidia/nemotron-3-nano-30b-a3b")
    NEBIUS_FALLBACK_MODELS: List[str] = [
        "nvidia/Nemotron-3_5-Lightning",
        "nvidia/nemotron-3-super-120b-a12b",
        "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF",
        "meta-llama/Meta-Llama-3.1-8B-Instruct"
    ]

    # Authentication
    JWT_SECRET: str = os.getenv("JWT_SECRET", "learnloop-super-secret-production-dev-key-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # File uploads & storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./backend/data/uploads")
    MAX_UPLOAD_SIZE_MB: int = 25
    CHUNK_SIZE: int = 450
    CHUNK_OVERLAP: int = 75
    EMBEDDING_DIMENSION: int = 384

    # Agent limits
    AGENT_MAX_TOOL_CALLS: int = 8
    AGENT_TIMEOUT_SECONDS: int = 30

    # Planner formula weights: Priority = 0.35*(1-mastery) + 0.25*exam_urgency + 0.20*forgetting_risk + 0.20*prereq_impact
    WEIGHT_MASTERY_DEFICIT: float = 0.35
    WEIGHT_EXAM_URGENCY: float = 0.25
    WEIGHT_FORGETTING_RISK: float = 0.20
    WEIGHT_PREREQUISITE_IMPACT: float = 0.20

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs("./backend/data", exist_ok=True)
