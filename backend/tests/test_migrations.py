import os
import subprocess
import sys
from pathlib import Path
from sqlalchemy import create_engine, inspect, text

ROOT = Path(__file__).resolve().parents[2]


def test_migration_roundtrip_and_schema_match(tmp_path):
    url = 'sqlite:///' + (tmp_path / 'migration.db').as_posix()
    env = {**os.environ, 'DATABASE_URL': url, 'MIGRATION_DATABASE_URL': url}
    def alembic(*args):
        result = subprocess.run([sys.executable, '-m', 'alembic', *args], cwd=ROOT,
                                env=env, capture_output=True, text=True)
        assert result.returncode == 0, result.stdout + result.stderr
    alembic('upgrade', 'head')
    alembic('check')
    engine = create_engine(url)
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO users (id,email,hashed_password,full_name) VALUES ('migration-user','test@example.com','unused','Test')"))
    alembic('downgrade', '0001')
    alembic('upgrade', 'head')
    with engine.connect() as conn:
        assert conn.execute(text('SELECT count(*) FROM users')).scalar() == 1
        assert not conn.execute(text('PRAGMA foreign_key_check')).all()
    engine.dispose()


def test_postgres_migrations_render_in_dependency_order(tmp_path):
    env = {**os.environ, 'MIGRATION_DATABASE_URL': 'postgresql+psycopg://unused:unused@localhost/unused'}
    result = subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head', '--sql'],
                            cwd=ROOT, env=env, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    sql = result.stdout
    assert 'CREATE EXTENSION IF NOT EXISTS vector' in sql
    assert 'embedding VECTOR' in sql
    assert sql.index('ADD CONSTRAINT uq_courses_owner') < sql.index('ADD CONSTRAINT fk_topics_course_owner')
