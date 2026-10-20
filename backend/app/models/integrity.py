"""Cross-table tenant constraints shared by the existing legacy models.

Keeping these together makes ownership relationships auditable. Import once,
after all models are registered; Alembic snapshots them in revision 0003.
"""
from sqlalchemy import UniqueConstraint, ForeignKeyConstraint
from backend.app.database import Base


def register_ownership_constraints():
    tables = Base.metadata.tables
    for name in ("courses", "topics", "resources", "quiz_items", "quiz_attempts", "audio_conversations"):
        tables[name].append_constraint(UniqueConstraint("id", "user_id", name=f"uq_{name}_owner"))
    for name in ("topics", "resources", "quiz_items", "quiz_attempts", "audio_conversations"):
        tables[name].append_constraint(ForeignKeyConstraint(
            ["course_id", "user_id"], ["courses.id", "courses.user_id"],
            name=f"fk_{name}_course_owner", ondelete="CASCADE"))
    for name, parent, column in (
        ("resource_chunks", "resources", "resource_id"),
        ("quiz_items", "topics", "topic_id"),
        ("mastery_states", "topics", "topic_id"),
        ("mastery_events", "topics", "topic_id"),
        ("quiz_answers", "quiz_items", "quiz_item_id"),
        ("quiz_answers", "quiz_attempts", "attempt_id"),
        ("audio_messages", "audio_conversations", "conversation_id"),
    ):
        tables[name].append_constraint(ForeignKeyConstraint(
            [column, "user_id"], [f"{parent}.id", f"{parent}.user_id"],
            name=f"fk_{name}_{column}_owner", ondelete="CASCADE"))


register_ownership_constraints()
