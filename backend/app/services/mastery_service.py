from datetime import datetime
from typing import Optional, Dict
from sqlalchemy.orm import Session
from backend.app.models.topic import MasteryState, Topic

class MasteryService:
    @classmethod
    def get_or_create_mastery(
        cls, db: Session, user_id: str, topic_id: str
    ) -> MasteryState:
        mastery = (
            db.query(MasteryState)
            .filter(MasteryState.user_id == user_id, MasteryState.topic_id == topic_id)
            .first()
        )
        if not mastery:
            mastery = MasteryState(
                user_id=user_id,
                topic_id=topic_id,
                mastery_score=0.20,
                confidence_score=0.10,
                evidence_count=0,
                correct_count=0,
                total_count=0,
            )
            db.add(mastery)
            db.flush()
        return mastery

    @classmethod
    def update_mastery_from_assessment(
        cls,
        db: Session,
        user_id: str,
        topic_id: str,
        is_correct: bool,
        difficulty: str = "medium"
    ) -> MasteryState:
        """
        Deterministic, bounded mastery update policy:
        - difficulty factor: easy: 0.75, medium: 1.0, hard: 1.25
        - delta: +0.15 * diff on correct, -0.20 * diff on incorrect
        - bounded to [0.0, 1.0]
        - confidence grows logarithmically with evidence count up to 1.0
        """
        mastery = cls.get_or_create_mastery(db, user_id, topic_id)

        difficulty_mult = {"easy": 0.75, "medium": 1.0, "hard": 1.25}.get(
            difficulty.lower(), 1.0
        )

        current_score = mastery.mastery_score
        mastery.total_count += 1
        mastery.evidence_count += 1

        if is_correct:
            mastery.correct_count += 1
            delta = 0.15 * difficulty_mult
            new_score = min(1.0, current_score + delta)
        else:
            delta = 0.20 * difficulty_mult
            new_score = max(0.0, current_score - delta)

        mastery.mastery_score = round(new_score, 4)
        mastery.confidence_score = round(min(1.0, mastery.evidence_count / 5.0), 3)
        mastery.last_assessed_at = datetime.utcnow()
        mastery.updated_at = datetime.utcnow()

        db.flush()
        return mastery

    @classmethod
    def get_course_mastery_overview(
        cls, db: Session, user_id: str, course_id: str
    ) -> Dict[str, any]:
        topics = db.query(Topic).filter(Topic.course_id == course_id).all()
        if not topics:
            return {
                "overall_mastery": 0.0,
                "total_topics": 0,
                "mastered": 0,
                "needs_attention": 0,
            }

        topic_ids = [t.id for t in topics]
        masteries = (
            db.query(MasteryState)
            .filter(MasteryState.user_id == user_id, MasteryState.topic_id.in_(topic_ids))
            .all()
        )
        mastery_map = {m.topic_id: m.mastery_score for m in masteries}

        scores = [mastery_map.get(t.id, 0.20) for t in topics]
        avg_score = sum(scores) / len(scores) if scores else 0.0
        mastered = sum(1 for s in scores if s >= 0.75)
        needs_attention = sum(1 for s in scores if s < 0.50)

        return {
            "overall_mastery": round(avg_score, 3),
            "total_topics": len(topics),
            "mastered": mastered,
            "needs_attention": needs_attention,
        }
