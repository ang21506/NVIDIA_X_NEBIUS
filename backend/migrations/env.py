from alembic import context
from sqlalchemy import create_engine, pool
from backend.app.config import settings
from backend.app.models import Base

url = settings.MIGRATION_DATABASE_URL or settings.DATABASE_URL
if url.startswith("postgresql://"):
    url = url.replace("postgresql://", "postgresql+psycopg://", 1)

if context.is_offline_mode():
    context.configure(url=url, target_metadata=Base.metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata,
                          render_as_batch=connection.dialect.name == "sqlite",
                          compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
