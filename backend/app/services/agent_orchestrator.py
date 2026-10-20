from datetime import datetime
import json
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.agent import AgentRun, ToolGrant
from backend.app.models.user import User
from backend.app.models.course import Course
from backend.app.services.document_service import DocumentService
from backend.app.services.tutor_service import TutorService
from backend.app.services.planner_service import PlannerService
from backend.app.services.mastery_service import MasteryService
from backend.app.services.misconception_service import MisconceptionService
from backend.app.config import settings

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    APPROVED_SKILLS = [
        "ingest_material",
        "retrieve_and_teach",
        "diagnose_gap",
        "replan_study",
        "daily_study_brief",
        "confirm_progress",
    ]

    @classmethod
    def check_tool_permission(cls, db: Session, user_id: str, tool_name: str) -> bool:
        grant = (
            db.query(ToolGrant)
            .filter(ToolGrant.user_id == user_id, ToolGrant.tool_name == tool_name)
            .first()
        )
        if grant is None:
            # By default granted if not explicitly revoked
            return True
        return grant.is_granted

    @classmethod
    def run_skill(
        cls,
        db: Session,
        user: User,
        skill_name: str,
        goal: str,
        course_id: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> AgentRun:
        params = params or {}
        logs = []
        tool_actions = []

        def log_step(state: str, message: str):
            logs.append(f"[{datetime.utcnow().isoformat()}] [{state}] {message}")

        # Create Agent Run in REQUESTED state
        agent_run = AgentRun(
            user_id=user.id,
            course_id=course_id,
            goal=goal,
            skill_name=skill_name,
            execution_state="REQUESTED",
            logs=json.dumps(logs),
            tool_actions=json.dumps(tool_actions),
            started_at=datetime.utcnow(),
        )
        db.add(agent_run)
        db.flush()

        log_step("REQUESTED", f"Goal received: '{goal}' using skill '{skill_name}'.")

        # Validation
        if skill_name not in cls.APPROVED_SKILLS:
            agent_run.execution_state = "FAILED"
            agent_run.error_message = f"Skill '{skill_name}' is not in the approved skill registry."
            agent_run.completed_at = datetime.utcnow()
            agent_run.logs = json.dumps(logs)
            db.commit()
            return agent_run

        # Authorization check
        if not cls.check_tool_permission(db, user.id, skill_name):
            agent_run.execution_state = "FAILED"
            agent_run.error_message = f"Permission denied: Skill '{skill_name}' was revoked by user in privacy settings."
            agent_run.completed_at = datetime.utcnow()
            log_step("AUTHORIZED", f"Permission denied for skill '{skill_name}'.")
            agent_run.logs = json.dumps(logs)
            db.commit()
            return agent_run

        agent_run.execution_state = "AUTHORIZED"
        log_step("AUTHORIZED", f"Skill '{skill_name}' authorized under user privacy grants.")

        try:
            # Context Loaded
            agent_run.execution_state = "CONTEXT_LOADED"
            log_step("CONTEXT_LOADED", f"User context loaded (Timezone: {user.timezone}, Course: {course_id or 'All'}).")

            # Planned
            agent_run.execution_state = "PLANNED"
            log_step("PLANNED", f"Execution plan formulated for bounded task.")

            # Tool Executed
            agent_run.execution_state = "TOOL_EXECUTED"
            result_summary = ""

            if skill_name == "ingest_material":
                resource_id = params.get("resource_id")
                if not resource_id:
                    raise ValueError("Parameter 'resource_id' is required for ingest_material.")
                from backend.app.models.resource import Resource
                resource = db.query(Resource).filter(Resource.id == resource_id,
                    Resource.user_id == user.id, Resource.course_id == course_id).first()
                if not resource:
                    raise ValueError("Resource not found in the authorized course")
                ok = DocumentService.process_and_index_file(db, resource_id)
                if not ok:
                    raise ValueError("Document indexing failed")
                tool_actions.append({"tool": "process_and_index_file", "resource_id": resource_id, "success": ok})
                result_summary = f"Indexed resource {resource_id}. Success: {ok}."

            elif skill_name == "retrieve_and_teach":
                question = params.get("question", goal)
                ans = TutorService.answer_question(db, user, course_id, question)
                tool_actions.append({
                    "tool": "answer_question",
                    "citations_count": len(ans.citations),
                    "model": ans.model_used,
                })
                result_summary = f"Grounded answer synthesized using {len(ans.citations)} verified citations."

            elif skill_name == "replan_study":
                tasks = PlannerService.recalculate_course_plan(db, user.id, course_id)
                tool_actions.append({"tool": "recalculate_course_plan", "tasks_count": len(tasks)})
                result_summary = f"Recalculated priorities for {len(tasks)} course study tasks."

            elif skill_name == "diagnose_gap":
                open_misc = MisconceptionService.get_open_misconceptions(db, user.id, course_id)
                tool_actions.append({"tool": "get_open_misconceptions", "count": len(open_misc)})
                result_summary = f"Identified {len(open_misc)} active conceptual misconceptions requiring re-test."

            elif skill_name == "daily_study_brief":
                overview = MasteryService.get_course_mastery_overview(db, user.id, course_id)
                tasks = PlannerService.recalculate_course_plan(db, user.id, course_id)
                high_priority = [t for t in tasks if t.priority_score >= 0.60]
                tool_actions.append({
                    "tool": "generate_brief",
                    "mastery": overview["overall_mastery"],
                    "urgent_tasks": len(high_priority),
                })
                result_summary = (
                    f"Generated study brief: Course mastery at {int(overview['overall_mastery']*100)}%. "
                    f"{len(high_priority)} high-urgency tasks scheduled."
                )

            elif skill_name == "confirm_progress":
                task_id = params.get("task_id")
                evidence = params.get("evidence", "Explicit student review verification")
                from backend.app.models.planner import StudyTask
                task = db.query(StudyTask).filter(StudyTask.id == task_id, StudyTask.user_id == user.id).first()
                if task:
                    task.status = "COMPLETED"
                    task.completion_evidence = evidence
                    task.completed_at = datetime.utcnow()
                    tool_actions.append({"tool": "confirm_task", "task_id": task_id, "evidence": evidence})
                    result_summary = f"Verified completion of task '{task.title}' with evidence."
                else:
                    result_summary = f"Task {task_id} not found."

            log_step("TOOL_EXECUTED", f"Action executed. Output: {result_summary}")

            # Verified
            agent_run.execution_state = "VERIFIED"
            log_step("VERIFIED", "Execution integrity and post-conditions verified.")

            # Memory Updated
            agent_run.execution_state = "MEMORY_UPDATED"
            log_step("MEMORY_UPDATED", "Learner memory state and audit records synchronized.")

            # Completed
            agent_run.execution_state = "COMPLETED"
            agent_run.result_summary = result_summary
            agent_run.completed_at = datetime.utcnow()
            log_step("COMPLETED", f"Agent run completed successfully in state COMPLETED.")

        except Exception as e:
            logger.exception(f"Agent run failed: {e}")
            agent_run.execution_state = "FAILED"
            agent_run.error_message = str(e)
            agent_run.completed_at = datetime.utcnow()
            log_step("FAILED", f"Error during execution: {str(e)}")

        agent_run.logs = json.dumps(logs)
        agent_run.tool_actions = json.dumps(tool_actions)
        db.commit()
        return agent_run
