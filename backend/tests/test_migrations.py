import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parents[2]


def run_alembic(*args, env):
    result = subprocess.run(
        [sys.executable, '-m', 'alembic', *args],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    return result


def test_migration_roundtrip_and_schema_match():
    """Upgrade → check → insert user → downgrade to 0001 → upgrade → verify data survives."""
    tmp_dir = tempfile.mkdtemp(prefix='ll-migrations-')
    try:
        db_path = (Path(tmp_dir) / 'migration.db').as_posix()
        url = 'sqlite:///' + db_path
        env = {**os.environ, 'DATABASE_URL': url, 'MIGRATION_DATABASE_URL': url}

        run_alembic('upgrade', 'head', env=env)
        run_alembic('check', env=env)

        engine = create_engine(url)
        with engine.begin() as conn:
            conn.execute(text(
                "INSERT INTO users (id, email, hashed_password, full_name)"
                " VALUES ('migration-user', 'test@example.com', 'unused', 'Test')"
            ))

        run_alembic('downgrade', '0001', env=env)
        run_alembic('upgrade', 'head', env=env)

        with engine.connect() as conn:
            assert conn.execute(text('SELECT count(*) FROM users')).scalar() == 1
            assert not conn.execute(text('PRAGMA foreign_key_check')).all()

        engine.dispose()
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def test_postgres_migrations_render_in_dependency_order():
    """Verify that the Postgres SQL output contains pgvector and ownership constraints in the right order."""
    env = {
        **os.environ,
        'MIGRATION_DATABASE_URL': 'postgresql+psycopg://unused:unused@localhost/unused',
    }
    result = subprocess.run(
        [sys.executable, '-m', 'alembic', 'upgrade', 'head', '--sql'],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    sql = result.stdout
    assert 'CREATE EXTENSION IF NOT EXISTS vector' in sql
    assert 'embedding VECTOR' in sql
    assert sql.index('ADD CONSTRAINT uq_courses_owner') < sql.index('ADD CONSTRAINT fk_topics_course_owner')
