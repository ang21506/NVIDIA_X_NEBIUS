"""Add token_version for session revocation, email verification fields, and auth tokens table.

- token_version (int, default 0): increment to invalidate all sessions for a user.
- is_email_verified (bool, default true): backward-compatible for existing users.
- email_verified_at (datetime, nullable): when email was verified.
- auth_tokens table: single-use expiring tokens for email verification and password reset.

WARNING: Requires the migration role (DDL rights). Do not apply to Supabase without approval.
"""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    # Add new user fields — nullable=True avoids ALTER TABLE issues on SQLite
    # and is safe because server_default supplies the value for existing rows.
    with op.batch_alter_table('users') as batch:
        batch.add_column(sa.Column('token_version', sa.Integer(), nullable=True, server_default='0'))
        batch.add_column(sa.Column('is_email_verified', sa.Boolean(), nullable=True, server_default='1'))
        batch.add_column(sa.Column('email_verified_at', sa.DateTime(), nullable=True))

    # Single-use expiring tokens for email verification and password reset.
    # Note: unique=True on the index (not a separate UniqueConstraint) to match ORM column definition.
    op.create_table(
        'auth_tokens',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False),
        sa.Column('purpose', sa.String(32), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_auth_tokens_user_id', 'auth_tokens', ['user_id'])
    op.create_index('ix_auth_tokens_token_hash', 'auth_tokens', ['token_hash'], unique=True)


def downgrade():
    op.drop_index('ix_auth_tokens_token_hash', table_name='auth_tokens')
    op.drop_index('ix_auth_tokens_user_id', table_name='auth_tokens')
    op.drop_table('auth_tokens')

    with op.batch_alter_table('users') as batch:
        batch.drop_column('email_verified_at')
        batch.drop_column('is_email_verified')
        batch.drop_column('token_version')
