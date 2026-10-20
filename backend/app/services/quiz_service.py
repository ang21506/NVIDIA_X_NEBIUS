import json
import hashlib
from fastapi import HTTPException
import logging
from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from backend.app.models.assessment import QuizItem, QuizAttempt, QuizAnswer
from backend.app.models.topic import Topic
from backend.app.models.course import Course
from backend.app.models.learning_event import MasteryEvent
from backend.app.services.mastery_service import MasteryService
from backend.app.services.misconception_service import MisconceptionService
from backend.app.services.planner_service import PlannerService
from backend.app.schemas.quiz import QuizSubmitRequest, QuizResultResponse, QuizAnswerResult

logger = logging.getLogger(__name__)

class QuizService:
    @classmethod
    def get_or_generate_quiz_items(
        cls,
        db: Session,
        user_id: str,
        course_id: str,
        topic_ids: Optional[List[str]] = None,
        num_questions: int = 5,
        difficulty: str = "medium",
    ) -> List[QuizItem]:
        query = db.query(QuizItem).filter(
            QuizItem.user_id == user_id,
            QuizItem.course_id == course_id
        )
        if topic_ids:
            query = query.filter(QuizItem.topic_id.in_(topic_ids))

        items = query.limit(num_questions).all()
        return items

    @classmethod
    def submit_and_score_quiz(
        cls, db: Session, user_id: str, payload: QuizSubmitRequest
    ) -> QuizResultResponse:
        """
        Deterministic scoring on backend. Updates mastery states, detects misconceptions,
        and triggers study planner recalculation in a single atomic transaction.
        """
        course_id = payload.course_id
        # Serialize submissions within a course, including first-time mastery
        # creation and retries. PostgreSQL holds this lock until commit/rollback.
        course = db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).with_for_update().first()
        if not course:
            raise HTTPException(404, "Course not found")
        fingerprint = hashlib.sha256(json.dumps(
            {"course_id": course_id, "answers": [a.model_dump() for a in payload.answers]},
            sort_keys=True).encode()).hexdigest()
        if payload.idempotency_key:
            previous = db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.idempotency_key == payload.idempotency_key).first()
            if previous:
                if previous.request_hash != fingerprint:
                    raise HTTPException(409, "Idempotency key was already used for a different submission")
                return QuizResultResponse.model_validate_json(previous.result_json)
        ids = [a.quiz_item_id for a in payload.answers]
        if not ids or len(ids) != len(set(ids)):
            raise HTTPException(400, "Submit each quiz question exactly once")
        items = db.query(QuizItem).filter(QuizItem.id.in_(ids), QuizItem.user_id == user_id,
                                         QuizItem.course_id == course_id).all()
        if len(items) != len(ids):
            raise HTTPException(400, "Submission contains unavailable questions")
        item_map = {item.id: item for item in items}
        total_items = len(payload.answers)
        correct_items = 0
        answer_results: List[QuizAnswerResult] = []
        newly_detected_misconceptions = []
        updated_mastery_map: Dict[str, float] = {}

        # Create Quiz Attempt record
        attempt = QuizAttempt(
            user_id=user_id,
            course_id=course_id,
            total_items=total_items,
            correct_items=0,
            score_percentage=0.0,
            submitted_at=datetime.utcnow(),
            idempotency_key=payload.idempotency_key,
            request_hash=fingerprint,
        )
        db.add(attempt)
        db.flush()

        for ans in payload.answers:
            item = item_map[ans.quiz_item_id]

            selected = ans.selected_answer.strip()
            correct = item.correct_answer.strip()
            is_correct = (selected.lower() == correct.lower())

            detected_misconception_title = None
            evidence_quote = None

            if is_correct:
                correct_items += 1
                # If this item was a re-test targeting an earlier misconception, evaluate resolution
                if item.target_misconception:
                    resolved = MisconceptionService.resolve_misconception_if_verified(
                        db=db,
                        user_id=user_id,
                        topic_id=item.topic_id,
                        target_misconception_title=item.target_misconception,
                        evidence_answer=selected,
                    )
                    if resolved:
                        logger.info(f"Resolved misconception: {resolved.title}")
            else:
                # Student missed the question
                if item.target_misconception:
                    detected_misconception_title = item.target_misconception
                    evidence_quote = f"Student selected '{selected}' instead of '{correct}'."
                    topic = db.query(Topic).filter(Topic.id == item.topic_id).first()
                    topic_title = topic.title if topic else "Machine Learning"

                    remediation = (
                        f"In an imbalanced dataset (e.g., 99% negative, 1% positive), a naive model that predicts "
                        f"ALL samples as negative achieves 99% accuracy, but has 0% recall (identifying 0 true positives). "
                        f"Recall = TP / (TP + FN). Always inspect the confusion matrix rather than relying on accuracy alone."
                    )

                    recorded_misc = MisconceptionService.record_misconception(
                        db=db,
                        user_id=user_id,
                        course_id=course_id,
                        topic_id=item.topic_id,
                        title=detected_misconception_title,
                        description=f"Confusion between overall accuracy and minority class recall on topic: {topic_title}.",
                        evidence_question=item.question,
                        evidence_answer=selected,
                        expected_concept=correct,
                        remediation_provided=remediation,
                        confidence=0.92,
                    )
                    newly_detected_misconceptions.append({
                        "id": recorded_misc.id,
                        "title": recorded_misc.title,
                        "status": recorded_misc.status,
                        "remediation": recorded_misc.remediation_provided,
                    })

            # Save individual answer record
            db_answer = QuizAnswer(
                attempt_id=attempt.id,
                quiz_item_id=item.id,
                user_id=user_id,
                selected_answer=selected,
                is_correct=is_correct,
                detected_misconception=detected_misconception_title,
                evidence_quote=evidence_quote,
            )
            db.add(db_answer)
            db.flush()
            previous_state = MasteryService.get_or_create_mastery(db, user_id, item.topic_id)
            previous_score = previous_state.mastery_score

            # Update Topic Mastery deterministically
            updated_state = MasteryService.update_mastery_from_assessment(
                db=db,
                user_id=user_id,
                topic_id=item.topic_id,
                is_correct=is_correct,
                difficulty=item.difficulty or "medium",
            )
            updated_mastery_map[item.topic_id] = updated_state.mastery_score
            db.add(MasteryEvent(user_id=user_id, topic_id=item.topic_id,
                               quiz_answer_id=db_answer.id, previous_score=previous_score,
                               new_score=updated_state.mastery_score, is_correct=is_correct))

            answer_results.append(
                QuizAnswerResult(
                    quiz_item_id=item.id,
                    question=item.question,
                    selected_answer=selected,
                    correct_answer=correct,
                    is_correct=is_correct,
                    explanation=item.explanation,
                    detected_misconception=detected_misconception_title,
                    evidence_quote=evidence_quote,
                )
            )

        # Update attempt totals
        score_pct = round((correct_items / total_items * 100.0), 1) if total_items > 0 else 0.0
        attempt.correct_items = correct_items
        attempt.score_percentage = score_pct

        # Recalculate study planner automatically with the new evidence
        PlannerService.recalculate_course_plan(db=db, user_id=user_id, course_id=course_id, commit=False)
        result = QuizResultResponse(
            attempt_id=attempt.id,
            course_id=course_id,
            total_items=total_items,
            correct_items=correct_items,
            score_percentage=score_pct,
            answers=answer_results,
            detected_misconceptions=newly_detected_misconceptions,
            updated_mastery=updated_mastery_map,
            planner_updated=True,
        )
        attempt.result_json = result.model_dump_json()
        db.commit()
        return result
