"""Database-enforced ownership boundaries (frozen revision)."""
from alembic import op

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None

OWNERS = ('courses', 'topics', 'resources', 'quiz_items', 'quiz_attempts', 'audio_conversations')
LINKS = [
    ('topics', 'course_id', 'courses'),
    ('resources', 'course_id', 'courses'),
    ('quiz_items', 'course_id', 'courses'),
    ('quiz_attempts', 'course_id', 'courses'),
    ('audio_conversations', 'course_id', 'courses'),
    ('resource_chunks', 'resource_id', 'resources'),
    ('quiz_items', 'topic_id', 'topics'),
    ('mastery_states', 'topic_id', 'topics'),
    ('mastery_events', 'topic_id', 'topics'),
    ('quiz_answers', 'quiz_item_id', 'quiz_items'),
    ('quiz_answers', 'attempt_id', 'quiz_attempts'),
    ('audio_messages', 'conversation_id', 'audio_conversations'),
]

def constraint_name(table, column):
    suffix = 'course' if column == 'course_id' else column
    return f'fk_{table}_{suffix}_owner'

def upgrade():
    # All referenced keys must exist before PostgreSQL accepts any composite FK.
    for table in OWNERS:
        with op.batch_alter_table(table) as batch:
            batch.create_unique_constraint(f'uq_{table}_owner', ['id', 'user_id'])
    for table, column, parent in LINKS:
        with op.batch_alter_table(table) as batch:
            batch.create_foreign_key(constraint_name(table, column), parent,
                                     [column, 'user_id'], ['id', 'user_id'], ondelete='CASCADE')

def downgrade():
    for table, column, parent in reversed(LINKS):
        with op.batch_alter_table(table) as batch:
            batch.drop_constraint(constraint_name(table, column), type_='foreignkey')
    for table in reversed(OWNERS):
        with op.batch_alter_table(table) as batch:
            batch.drop_constraint(f'uq_{table}_owner', type_='unique')
