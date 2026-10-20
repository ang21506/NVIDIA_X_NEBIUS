"""Optional real PostgreSQL test. Use a dedicated disposable test database."""
import os
import subprocess
import sys
import uuid
from pathlib import Path
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from backend.app.services.seed_service import SeedService
from backend.app.services.document_service import DocumentService
from backend.app.models.course import Course


@pytest.mark.skipif(not os.getenv('TEST_POSTGRES_URL'), reason='TEST_POSTGRES_URL is not configured')
def test_postgres_migrations_and_vector_retrieval():
    url = make_url(os.environ['TEST_POSTGRES_URL'])
    assert url.get_backend_name() == 'postgresql'
    if url.drivername == 'postgresql':
        url = url.set(drivername='postgresql+psycopg')
    schema = 'jarvis_test_' + uuid.uuid4().hex
    admin = create_engine(url)
    with admin.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA {schema}'))
    test_url = url.update_query_dict({'options': f'-csearch_path={schema},public,extensions'})
    engine = create_engine(test_url)
    try:
        env = {**os.environ, 'DATABASE_URL': test_url.render_as_string(hide_password=False),
               'MIGRATION_DATABASE_URL': test_url.render_as_string(hide_password=False)}
        root = Path(__file__).resolve().parents[2]
        result = subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'],
                                cwd=root, env=env, capture_output=True, text=True)
        assert result.returncode == 0, 'PostgreSQL migration failed; inspect the test database and migration configuration.'
        with Session(engine) as db:
            user = SeedService.seed_demo_data(db)
            course = db.query(Course).filter(Course.user_id == user.id).first()
            chunks = DocumentService.search_chunks(db, user.id, course.id, 'accuracy and recall')
            assert chunks and isinstance(chunks[0]['similarity'], float)
            assert not DocumentService.search_chunks(db, str(uuid.uuid4()), course.id, 'accuracy')
        result = subprocess.run([sys.executable, '-m', 'alembic', 'downgrade', '0001'],
                                cwd=root, env=env, capture_output=True, text=True)
        assert result.returncode == 0, 'PostgreSQL downgrade failed'
    finally:
        engine.dispose()
        with admin.begin() as conn:
            conn.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        admin.dispose()
