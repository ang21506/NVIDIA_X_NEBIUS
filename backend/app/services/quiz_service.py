import json
import logging
from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from backend.app.models.assessment import QuizItem, QuizAttempt, QuizAnswer
from backend.app.models.topic import Topic
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
        )
        db.add(attempt)
        db.flush()

        for ans in payload.answers:
            item = db.query(QuizItem).filter(QuizItem.id == ans.quiz_item_id).first()
            if not item:
                continue

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

            # Update Topic Mastery deterministically
            updated_state = MasteryService.update_mastery_from_assessment(
                db=db,
                user_id=user_id,
                topic_id=item.topic_id,
                is_correct=is_correct,
                difficulty=item.difficulty or "medium",
            )
            updated_mastery_map[item.topic_id] = updated_state.mastery_score

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
        PlannerService.recalculate_course_plan(db=db, user_id=user_id, course_id=course_id)
        db.commit()

        return QuizResultResponse(
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
