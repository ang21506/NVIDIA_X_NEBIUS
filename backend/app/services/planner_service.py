from datetime import datetime, date, timedelta
import json
from typing import List, Dict
from sqlalchemy.orm import Session
from backend.app.models.course import Course
from backend.app.models.topic import Topic, TopicPrerequisite, MasteryState
from backend.app.models.misconception import Misconception
from backend.app.models.planner import StudyTask
from backend.app.config import settings

class PlannerService:
    @classmethod
    def calculate_topic_priority(
        cls,
        db: Session,
        user_id: str,
        course: Course,
        topic: Topic,
        total_topics: int,
    ) -> Dict[str, any]:
        # 1. Mastery Deficit (0 to 1)
        mastery_record = (
            db.query(MasteryState)
            .filter(MasteryState.user_id == user_id, MasteryState.topic_id == topic.id)
            .first()
        )
        mastery_score = mastery_record.mastery_score if mastery_record else 0.20
        mastery_deficit = 1.0 - mastery_score

        # 2. Exam Urgency (0 to 1)
        today = date.today()
        if course.exam_date:
            days_until_exam = (course.exam_date - today).days
            if days_until_exam <= 0:
                exam_urgency = 1.0
            elif days_until_exam >= 30:
                exam_urgency = 0.15
            else:
                exam_urgency = max(0.15, round(1.0 - (days_until_exam / 30.0), 3))
        else:
            exam_urgency = 0.30

        # 3. Forgetting Risk (0 to 1)
        if mastery_record and mastery_record.last_assessed_at:
            days_since = (datetime.utcnow() - mastery_record.last_assessed_at).days
            forgetting_risk = min(1.0, max(0.1, round(days_since / 14.0, 3)))
        else:
            forgetting_risk = 0.75  # High risk if unassessed

        # 4. Prerequisite Impact (0 to 1)
        # Count how many other topics depend on this topic
        dependents_count = (
            db.query(TopicPrerequisite)
            .filter(TopicPrerequisite.prerequisite_topic_id == topic.id)
            .count()
        )
        if total_topics > 1:
            prereq_impact = min(1.0, max(0.1, round(dependents_count / (total_topics - 1), 3)))
        else:
            prereq_impact = 0.10

        # Check for open misconceptions
        open_misconceptions = (
            db.query(Misconception)
            .filter(
                Misconception.user_id == user_id,
                Misconception.topic_id == topic.id,
                Misconception.status != "RESOLVED",
            )
            .count()
        )

        # Composite Priority Formula
        priority = (
            settings.WEIGHT_MASTERY_DEFICIT * mastery_deficit
            + settings.WEIGHT_EXAM_URGENCY * exam_urgency
            + settings.WEIGHT_FORGETTING_RISK * forgetting_risk
            + settings.WEIGHT_PREREQUISITE_IMPACT * prereq_impact
        )
        priority = round(min(1.0, max(0.05, priority)), 3)

        # Determine Reason Codes
        reasons = []
        if mastery_score < 0.50:
            reasons.append("LOW_MASTERY")
        if open_misconceptions > 0:
            reasons.append("RECENT_ERROR")
        if exam_urgency >= 0.60:
            reasons.append("EXAM_URGENCY")
        if forgetting_risk >= 0.50:
            reasons.append("REVISION_DUE")
        if prereq_impact >= 0.40 and mastery_score < 0.70:
            reasons.append("PREREQUISITE_GAP")
        if not reasons:
            reasons.append("ROUTINE_PRACTICE")

        return {
            "priority": priority,
            "mastery_score": mastery_score,
            "mastery_deficit": round(mastery_deficit, 3),
            "exam_urgency": exam_urgency,
            "forgetting_risk": forgetting_risk,
            "prereq_impact": prereq_impact,
            "open_misconceptions": open_misconceptions,
            "reasons": reasons,
        }

    @classmethod
    def recalculate_course_plan(
        cls, db: Session, user_id: str, course_id: str
    ) -> List[StudyTask]:
        """
        Recalculates study task priorities deterministically whenever new assessment
        evidence arrives, exam dates change, or misconceptions update.
        """
        course = db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).first()
        if not course:
            return []

        topics = db.query(Topic).filter(Topic.course_id == course_id).all()
        if not topics:
            return []

        total_topics = len(topics)
        evaluated_topics = []

        for topic in topics:
            metrics = cls.calculate_topic_priority(db, user_id, course, topic, total_topics)
            evaluated_topics.append((topic, metrics))

        # Order by descending priority
        evaluated_topics.sort(key=lambda item: item[1]["priority"], reverse=True)

        existing_tasks = (
            db.query(StudyTask)
            .filter(StudyTask.user_id == user_id, StudyTask.course_id == course_id)
            .all()
        )
        task_map = {t.topic_id: t for t in existing_tasks if t.topic_id}

        today = date.today()
        updated_tasks = []

        for rank, (topic, metrics) in enumerate(evaluated_topics):
            # Target due date staggered based on priority ranking
            target_due = today + timedelta(days=min(rank, 7))
            task_title = f"Review & Practice: {topic.title}"
            task_desc = (
                f"Priority {metrics['priority']:.2f}. "
                f"Mastery: {int(metrics['mastery_score']*100)}%. "
                f"Triggered by: {', '.join(metrics['reasons'])}."
            )

            if topic.id in task_map:
                task = task_map[topic.id]
                # Update priority and reasons if not already completed
                if task.status != "COMPLETED":
                    task.priority_score = metrics["priority"]
                    task.reason_codes = json.dumps(metrics["reasons"])
                    task.due_date = target_due
                    task.description = task_desc
                    task.updated_at = datetime.utcnow()
                updated_tasks.append(task)
            else:
                new_task = StudyTask(
                    user_id=user_id,
                    course_id=course_id,
                    topic_id=topic.id,
                    title=task_title,
                    description=task_desc,
                    due_date=target_due,
                    estimated_minutes=35,
                    priority_score=metrics["priority"],
                    reason_codes=json.dumps(metrics["reasons"]),
                    status="RECOMMENDED",
                )
                db.add(new_task)
                updated_tasks.append(new_task)

        db.commit()
        return updated_tasks
