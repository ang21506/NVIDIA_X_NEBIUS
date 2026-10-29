import json
import pytest

def test_auth_and_demo_login(client):
    # Test Demo Login
    demo_resp = client.post("/v1/auth/demo-login")
    assert demo_resp.status_code == 200
    demo_data = demo_resp.json()
    assert "access_token" in demo_data
    assert demo_data["email"] == "demo@learnloop.ai"

    # Test Registration
    reg_resp = client.post(
        "/v1/auth/register",
        json={
            "email": "student_test@university.edu",
            "password": "Password123!",
            "full_name": "Test Student",
            "timezone": "UTC"
        }
    )
    assert reg_resp.status_code == 201
    assert "access_token" in reg_resp.json()

    # Test Login
    login_resp = client.post(
        "/v1/auth/login",
        json={
            "email": "student_test@university.edu",
            "password": "Password123!"
        }
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Test Authenticated Profile
    me_resp = client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "student_test@university.edu"

def test_course_crud_and_ownership(client):
    demo_token = client.post("/v1/auth/demo-login").json()["access_token"]
    headers = {"Authorization": f"Bearer {demo_token}"}

    # Fetch seeded demo course
    courses_resp = client.get("/v1/courses", headers=headers)
    assert courses_resp.status_code == 200
    courses = courses_resp.json()
    assert len(courses) >= 1
    ml_course = next(c for c in courses if c["code"] == "CS-401")
    assert ml_course["title"] == "Machine Learning Fundamentals"

    # Create new course
    create_resp = client.post(
        "/v1/courses",
        headers=headers,
        json={
            "title": "Data Structures & Algorithms",
            "code": "CS-201",
            "description": "Trees, Graphs, and Dynamic Programming",
            "available_hours_per_week": 8
        }
    )
    assert create_resp.status_code == 201
    new_course_id = create_resp.json()["id"]

    # Verify Detail
    detail_resp = client.get(f"/v1/courses/{new_course_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["title"] == "Data Structures & Algorithms"

    # Unauthorized access test with separate user
    other_token = client.post(
        "/v1/auth/register",
        json={
            "email": "other_student@test.com",
            "password": "Password123!",
            "full_name": "Other Student",
        }
    ).json()["access_token"]

    unauth_resp = client.get(f"/v1/courses/{new_course_id}", headers={"Authorization": f"Bearer {other_token}"})
    assert unauth_resp.status_code in [403, 404]

def test_document_retrieval_and_citations(client):
    demo_token = client.post("/v1/auth/demo-login").json()["access_token"]
    headers = {"Authorization": f"Bearer {demo_token}"}

    courses = client.get("/v1/courses", headers=headers).json()
    ml_course = next(c for c in courses if c["code"] == "CS-401")

    # Check resources
    res_resp = client.get(f"/v1/courses/{ml_course['id']}/resources", headers=headers)
    assert res_resp.status_code == 200
    resources = res_resp.json()
    assert len(resources) >= 1
    assert resources[0]["status"] == "INDEXED"

    # Test Grounded AI tutor question flow
    tutor_resp = client.post(
        "/v1/tutor/ask",
        headers=headers,
        json={
            "course_id": ml_course["id"],
            "question": "What is the accuracy paradox and why is accuracy misleading in imbalanced datasets?",
        }
    )
    assert tutor_resp.status_code == 200
    tutor_data = tutor_resp.json()
    assert "citations" in tutor_data
    # Verify citations contain actual retrieved excerpts from lecture notes
    assert len(tutor_data["citations"]) > 0
    assert "lecture_4_metrics_imbalanced.txt" in tutor_data["citations"][0]["filename"]

def test_kevin_voice_audio_conversations(client):
    demo_token = client.post("/v1/auth/demo-login").json()["access_token"]
    headers = {"Authorization": f"Bearer {demo_token}"}

    courses = client.get("/v1/courses", headers=headers).json()
    ml_course = next(c for c in courses if c["code"] == "CS-401")

    # Ask KEVIN via voice endpoint
    voice_resp = client.post(
        "/v1/tutor/voice/ask",
        headers=headers,
        data={
            "course_id": ml_course["id"],
            "transcript": "KEVIN, analyze false positives versus false negatives in disease diagnosis.",
        }
    )
    assert voice_resp.status_code == 200
    voice_data = voice_resp.json()
    assert "speech_text" in voice_data
    assert voice_data["conversation_id"] is not None

    # Retrieve conversation history
    conv_id = voice_data["conversation_id"]
    convs_resp = client.get(f"/v1/tutor/voice/conversations?course_id={ml_course['id']}", headers=headers)
    assert convs_resp.status_code == 200
    convs = convs_resp.json()
    assert len(convs) >= 1

    # Retrieve detailed conversation with audio messages
    detail_resp = client.get(f"/v1/tutor/voice/conversations/{conv_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["message_count"] >= 2  # user audio message + assistant speech message

def test_misconception_lifecycle_and_study_planner(client):
    demo_token = client.post("/v1/auth/demo-login").json()["access_token"]
    headers = {"Authorization": f"Bearer {demo_token}"}

    courses = client.get("/v1/courses", headers=headers).json()
    ml_course = next(c for c in courses if c["code"] == "CS-401")

    # Step 1: Generate Quiz
    quiz_items = client.post(
        "/v1/quizzes/generate",
        headers=headers,
        json={"course_id": ml_course["id"], "num_questions": 5}
    ).json()
    assert len(quiz_items) >= 2

    # Step 2: Intentional misconception submission
    # Question: "A model achieves 98% accuracy on a fraud detection dataset where 99% of samples are legitimate..."
    # Student incorrectly selects: "Yes, 98% accuracy guarantees high recall across all classes."
    target_q = next(q for q in quiz_items if "98% accuracy on a fraud detection" in q["question"])
    
    submit_resp = client.post(
        "/v1/quizzes/submit",
        headers=headers,
        json={
            "course_id": ml_course["id"],
            "answers": [
                {
                    "quiz_item_id": target_q["id"],
                    "selected_answer": "Yes, 98% accuracy guarantees high recall across all classes."
                }
            ]
        }
    )
    assert submit_resp.status_code == 200
    result = submit_resp.json()
    assert result["correct_items"] == 0
    assert len(result["detected_misconceptions"]) >= 1
    misc = result["detected_misconceptions"][0]
    assert "high overall accuracy guarantees high recall" in misc["title"]
    assert misc["status"] in ["NEWLY_DETECTED", "NEEDS_RETEST"]

    # Step 3: Verify Misconception Memory persistence
    mem_resp = client.get("/v1/memory/misconceptions", headers=headers)
    assert mem_resp.status_code == 200
    misconceptions = mem_resp.json()
    open_misc = [m for m in misconceptions if m["status"] != "RESOLVED"]
    assert len(open_misc) >= 1
    assert "accuracy" in open_misc[0]["title"].lower()

    # Step 4: Verify Study Planner recalculation with RECENT_ERROR reason code
    plan_resp = client.get(f"/v1/study-plans?course_id={ml_course['id']}", headers=headers)
    assert plan_resp.status_code == 200
    plan_data = plan_resp.json()
    assert len(plan_data["tasks"]) > 0
    # Top task should have high priority and reasons including RECENT_ERROR or LOW_MASTERY
    top_task = plan_data["tasks"][0]
    assert top_task["priority_score"] >= 0.50
    assert any(code in top_task["reason_codes"] for code in ["RECENT_ERROR", "LOW_MASTERY"])

    # Step 5: Follow-up targeted re-test resolves the misconception
    retest_q = next(q for q in quiz_items if "cancer screening test has 95% overall accuracy" in q["question"])
    resolve_resp = client.post(
        "/v1/quizzes/submit",
        headers=headers,
        json={
            "course_id": ml_course["id"],
            "answers": [
                {
                    "quiz_item_id": retest_q["id"],
                    "selected_answer": "0%"
                }
            ]
        }
    )
    assert resolve_resp.status_code == 200
    retest_result = resolve_resp.json()
    assert retest_result["correct_items"] == 1

    # Verify Misconception status transitioned to RESOLVED
    mem_after_resp = client.get("/v1/memory/misconceptions", headers=headers)
    resolved_misc = [m for m in mem_after_resp.json() if m["status"] == "RESOLVED"]
    assert len(resolved_misc) >= 1

    # Verify quiz attempts listing endpoint for analytics
    attempts_resp = client.get(f"/v1/quizzes/attempts?course_id={ml_course['id']}", headers=headers)
    assert attempts_resp.status_code == 200
    attempts_list = attempts_resp.json()
    assert len(attempts_list) >= 2  # initial misconception attempt + resolution attempt

def test_agent_orchestrator_and_grants(client):
    demo_token = client.post("/v1/auth/demo-login").json()["access_token"]
    headers = {"Authorization": f"Bearer {demo_token}"}

    courses = client.get("/v1/courses", headers=headers).json()
    ml_course = next(c for c in courses if c["code"] == "CS-401")

    # Run authorized skill: replan_study
    run_resp = client.post(
        "/v1/agent-runs",
        headers=headers,
        json={
            "goal": "Re-evaluate study schedule priorities",
            "skill_name": "replan_study",
            "course_id": ml_course["id"],
        }
    )
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    assert run_data["execution_state"] == "COMPLETED"
    assert "Recalculated priorities" in run_data["result_summary"]

    # Revoke tool grant for replan_study
    revoke_resp = client.post(
        "/v1/agent/grants",
        headers=headers,
        json={"tool_name": "replan_study", "is_granted": False}
    )
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["is_granted"] is False

    # Attempt running revoked skill -> should be denied
    denied_resp = client.post(
        "/v1/agent-runs",
        headers=headers,
        json={
            "goal": "Attempt running revoked skill",
            "skill_name": "replan_study",
            "course_id": ml_course["id"],
        }
    )
    assert denied_resp.status_code == 200
    assert denied_resp.json()["execution_state"] == "FAILED"
    assert "Permission denied" in denied_resp.json()["error_message"]

    # Re-grant tool
    client.post(
        "/v1/agent/grants",
        headers=headers,
        json={"tool_name": "replan_study", "is_granted": True}
    )

def test_settings_privacy_export_and_delete(client):
    demo_token = client.post("/v1/auth/demo-login").json()["access_token"]
    headers = {"Authorization": f"Bearer {demo_token}"}

    # Privacy info
    priv_resp = client.get("/v1/settings/privacy", headers=headers)
    assert priv_resp.status_code == 200
    assert priv_resp.json()["model_provider"] == "NVIDIA Nemotron via Nebius Token Factory"

    # Export
    export_resp = client.post("/v1/settings/export", headers=headers)
    assert export_resp.status_code == 200
    export_data = export_resp.json()
    assert "courses" in export_data
    assert "misconceptions" in export_data

    # Data deletion
    del_resp = client.delete("/v1/settings/data", headers=headers)
    assert del_resp.status_code == 200

    # Verify misconceptions purged
    misc_resp = client.get("/v1/memory/misconceptions", headers=headers)
    assert len(misc_resp.json()) == 0

    # Reset demo baseline
    reset_resp = client.post("/v1/settings/reset-demo", headers=headers)
    assert reset_resp.status_code == 200
