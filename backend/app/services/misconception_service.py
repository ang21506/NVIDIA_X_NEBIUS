from datetime import datetime, timedelta, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from backend.app.models.misconception import Misconception

class MisconceptionService:
    @classmethod
    def record_misconception(
        cls,
        db: Session,
        user_id: str,
        course_id: str,
        topic_id: str,
        title: str,
        description: str,
        evidence_question: str,
        evidence_answer: str,
        expected_concept: str,
        remediation_provided: Optional[str] = None,
        confidence: float = 0.90,
    ) -> Misconception:
        """
        Records a newly detected misconception or increments an existing open one.
        """
        existing = (
            db.query(Misconception)
            .filter(
                Misconception.user_id == user_id,
                Misconception.topic_id == topic_id,
                Misconception.title == title,
                Misconception.status != "RESOLVED",
            )
            .first()
        )

        if existing:
            existing.attempt_count += 1
            existing.evidence_question = evidence_question
            existing.evidence_answer = evidence_answer
            existing.last_assessed_outcome = "INCORRECT"
            existing.status = "NEEDS_RETEST"
            existing.next_review_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=1)
            existing.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            if remediation_provided:
                existing.remediation_provided = remediation_provided
            db.flush()
            return existing

        misconception = Misconception(
            user_id=user_id,
            course_id=course_id,
            topic_id=topic_id,
            title=title,
            description=description,
            evidence_question=evidence_question,
            evidence_answer=evidence_answer,
            expected_concept=expected_concept,
            remediation_provided=remediation_provided,
            confidence=confidence,
            status="NEWLY_DETECTED",
            next_review_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=1),
            attempt_count=1,
            last_assessed_outcome="INCORRECT",
        )
        db.add(misconception)
        db.flush()
        return misconception

    @classmethod
    def resolve_misconception_if_verified(
        cls,
        db: Session,
        user_id: str,
        topic_id: str,
        target_misconception_title: str,
        evidence_answer: str,
    ) -> Optional[Misconception]:
        """
        Strict resolution rule: A misconception is marked RESOLVED only upon an observable,
        correct assessment response targeted at this conceptual gap.
        """
        open_misconception = (
            db.query(Misconception)
            .filter(
                Misconception.user_id == user_id,
                Misconception.topic_id == topic_id,
                Misconception.title == target_misconception_title,
                Misconception.status != "RESOLVED",
            )
            .first()
        )

        if open_misconception:
            open_misconception.status = "RESOLVED"
            open_misconception.last_assessed_outcome = "CORRECT"
            open_misconception.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
            open_misconception.evidence_answer = f"Resolved via re-test: {evidence_answer}"
            open_misconception.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.flush()
            return open_misconception
        return None

    @classmethod
    def get_open_misconceptions(
        cls, db: Session, user_id: str, course_id: Optional[str] = None
    ) -> List[Misconception]:
        query = db.query(Misconception).filter(
            Misconception.user_id == user_id,
            Misconception.status != "RESOLVED"
        )
        if course_id:
            query = query.filter(Misconception.course_id == course_id)
        return query.order_by(Misconception.created_at.desc()).all()

    @classmethod
    def get_resolved_misconceptions(
        cls, db: Session, user_id: str, course_id: Optional[str] = None
    ) -> List[Misconception]:
        query = db.query(Misconception).filter(
            Misconception.user_id == user_id,
            Misconception.status == "RESOLVED"
        )
        if course_id:
            query = query.filter(Misconception.course_id == course_id)
        return query.order_by(Misconception.resolved_at.desc()).all()
