"""Add user preferences and study session tracking tables.

- user_preferences: one row per user, persists onboarding/learning preferences
- study_sessions: measured study time (not fabricated analytics)

NOTE: Requires approval before applying to Supabase production.
"""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    # Note: unique=True on the index (not a separate UniqueConstraint) to match ORM column definition.
    op.create_table(
        'user_preferences',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('learning_goals', sa.Text(), nullable=True),
        sa.Column('available_hours_per_week', sa.Float(), nullable=True),
        sa.Column('preferred_session_duration_minutes', sa.Integer(), server_default='45'),
        sa.Column('timezone', sa.String(64), server_default='UTC'),
        sa.Column('onboarding_completed', sa.Boolean(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_user_preferences_user_id', 'user_preferences', ['user_id'], unique=True)

    op.create_table(
        'study_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id', sa.String(36),
                  sa.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('session_type', sa.String(32), server_default='study'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_study_sessions_user_id', 'study_sessions', ['user_id'])
    op.create_index('ix_study_sessions_course_id', 'study_sessions', ['course_id'])


def downgrade():
    op.drop_index('ix_study_sessions_course_id', table_name='study_sessions')
    op.drop_index('ix_study_sessions_user_id', table_name='study_sessions')
    op.drop_table('study_sessions')

    op.drop_index('ix_user_preferences_user_id', table_name='user_preferences')
    op.drop_table('user_preferences')
