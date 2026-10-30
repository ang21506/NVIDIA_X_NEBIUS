"""Add background document processing jobs table.

Moves long-running extraction/chunking/embedding out of the synchronous upload
request into a durable PostgreSQL-backed job queue. Supports bounded retries,
exponential backoff, and recovery after worker crashes.

NOTE: Requires approval before applying to Supabase production.
"""
from alembic import op
import sqlalchemy as sa

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'processing_jobs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('resource_id', sa.String(36), sa.ForeignKey('resources.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'),
                  nullable=False),
        # PENDING → RUNNING → DONE | FAILED | CANCELLED
        sa.Column('status', sa.String(32), server_default='PENDING', nullable=False),
        sa.Column('attempt_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('max_attempts', sa.Integer(), server_default='3', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('next_attempt_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_processing_jobs_resource_id', 'processing_jobs', ['resource_id'])
    op.create_index('ix_processing_jobs_user_id', 'processing_jobs', ['user_id'])
    op.create_index('ix_processing_jobs_status', 'processing_jobs', ['status'])


def downgrade():
    op.drop_index('ix_processing_jobs_status', 'processing_jobs')
    op.drop_index('ix_processing_jobs_user_id', 'processing_jobs')
    op.drop_index('ix_processing_jobs_resource_id', 'processing_jobs')
    op.drop_table('processing_jobs')

