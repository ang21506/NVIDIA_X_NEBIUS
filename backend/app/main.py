import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.config import settings
from backend.app.database import engine, Base, get_db
from backend.app.models import *  # Import all models for declarative schema creation
from backend.app.services.seed_service import SeedService
from backend.app.services.nebius_ai_service import NebiusAIService

from backend.app.api.auth_routes import router as auth_router
from backend.app.api.course_routes import router as course_router
from backend.app.api.resource_routes import router as resource_router
from backend.app.api.topic_routes import router as topic_router
from backend.app.api.tutor_routes import router as tutor_router
from backend.app.api.quiz_routes import router as quiz_router
from backend.app.api.memory_routes import router as memory_router
from backend.app.api.study_plan_routes import router as study_plan_router
from backend.app.api.agent_routes import router as agent_router
from backend.app.api.settings_routes import router as settings_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("learnloop")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed demo data
    logger.info("Initializing database schema...")
    if settings.APP_ENV == "production":
        if engine.dialect.name != "postgresql":
            raise RuntimeError("Production requires PostgreSQL")
        if settings.AUTO_CREATE_TABLES or settings.SEED_DEMO_DATA or settings.ENABLE_DEMO_MODE:
            raise RuntimeError("Production requires migrations and demo seeding disabled")
        if len(settings.JWT_SECRET) < 32 or "learnloop" in settings.JWT_SECRET.lower():
            raise RuntimeError("Set a unique random JWT_SECRET for production")
        if settings.EMBEDDING_PROVIDER != "openai-compatible" or settings.EMBEDDING_MODEL_ID == "hash-v1":
            raise RuntimeError("Configure a semantic embedding model for production")
    if settings.AUTO_CREATE_TABLES:
        if engine.dialect.name != "sqlite":
            raise RuntimeError("Use Alembic migrations for PostgreSQL")
        Base.metadata.create_all(bind=engine)
    else:
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        from alembic.runtime.migration import MigrationContext
        from pathlib import Path
        config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
        with engine.connect() as connection:
            current = MigrationContext.configure(connection).get_current_revision()
        if current != ScriptDirectory.from_config(config).get_current_head():
            raise RuntimeError("Database schema is out of date. Run python -m alembic upgrade head")
    
    # Auto-seed demo student and ML course
    try:
        from backend.app.database import SessionLocal
        if settings.SEED_DEMO_DATA and settings.ENABLE_DEMO_MODE:
            with SessionLocal() as db:
                SeedService.seed_demo_data(db)
            logger.info("Demo data initialized.")
    except Exception as e:
        logger.warning(f"Could not auto-seed demo data on startup: {e}")

    yield
    # Shutdown
    logger.info("LearnLoop AI backend shutting down.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Autonomous, Privacy-Aware Personal Learning Agent powered by NVIDIA Nemotron and Nebius Token Factory",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"] if settings.DEBUG else settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth_router)
app.include_router(course_router)
app.include_router(resource_router)
app.include_router(topic_router)
app.include_router(tutor_router)
app.include_router(quiz_router)
app.include_router(memory_router)
app.include_router(study_plan_router)
app.include_router(agent_router)
app.include_router(settings_router)

@app.get("/health", tags=["Health"])
@app.get("/v1/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_ok = False

    return {
        "status": "healthy" if db_ok else "unhealthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database_connected": db_ok,
        "nebius_configured": NebiusAIService.is_configured(),
        "model": settings.NEBIUS_MODEL_ID,
    }
