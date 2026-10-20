import os
import tempfile
from pathlib import Path

# Never let tests open the developer's database or upload directory.
_temporary = tempfile.TemporaryDirectory(prefix="jarvis-tests-")
os.environ.update(DATABASE_URL="sqlite://", AUTO_CREATE_TABLES="true", SEED_DEMO_DATA="false", ENABLE_DEMO_MODE="true",
                  APP_ENV="test", EMBEDDING_PROVIDER="local", EMBEDDING_DIMENSION="384",
                  STORAGE_PROVIDER="local", NEBIUS_API_KEY="",
                  UPLOAD_DIR=str(Path(_temporary.name) / "uploads"),
                  AUDIO_DIR=str(Path(_temporary.name) / "audio"))

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.services.seed_service import SeedService


@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine)() as session:
        SeedService.seed_demo_data(session)
        yield session
        session.rollback()
    engine.dispose()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        except Exception:
            db.rollback()
            raise
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
