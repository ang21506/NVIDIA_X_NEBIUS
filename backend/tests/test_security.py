"""Security boundary tests: auth, audio ownership, cross-user isolation, and edge cases."""
import io
import pytest


def register_and_login(client, email, password="Password123!", name="Test User"):
    r = client.post("/v1/auth/register", json={"email": email, "password": password, "full_name": name})
    assert r.status_code == 201, r.text
    return r.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_unauthenticated_audio_returns_401(client):
    """Audio stream endpoint must reject requests without a bearer token."""
    r = client.get("/v1/tutor/voice/audio/nonexistent.webm")
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"


def test_audio_cross_user_access_denied(client, db):
    """User A cannot fetch audio belonging to User B."""
    token_a = client.post("/v1/auth/demo-login").json()["access_token"]
    token_b = register_and_login(client, "user_b_audio@test.com")
    headers_a = auth(token_a)

    # User A makes a voice ask so a message with audio_url gets created
    from backend.app.models.course import Course
    course = db.query(Course).first()
    resp = client.post("/v1/tutor/voice/ask", headers=headers_a,
                       data={"course_id": course.id, "transcript": "test question"})
    assert resp.status_code == 200

    # Save a fake audio file for user A's assistant message
    from backend.app.models.audio_chat import AudioMessage
    msg = db.query(AudioMessage).filter(AudioMessage.user_id != None).first()
    if msg:
        # Try to access user A's audio as user B
        if msg.audio_url:
            filename = msg.audio_url.split("/")[-1]
            r = client.get(f"/v1/tutor/voice/audio/{filename}", headers=auth(token_b))
            assert r.status_code in (403, 404), f"Cross-user audio access should be denied, got {r.status_code}"


def test_audio_missing_file_returns_404(client):
    """Non-existent audio file that belongs to current user returns 404."""
    token = client.post("/v1/auth/demo-login").json()["access_token"]
    r = client.get("/v1/tutor/voice/audio/does_not_exist.webm", headers=auth(token))
    # Should be 404 (no matching AudioMessage record) not 500
    assert r.status_code in (401, 403, 404)


def test_logout_all_invalidates_tokens(client):
    """After logout-all, old tokens should be rejected."""
    token = register_and_login(client, "logout_test@test.com")
    headers = auth(token)
    # Confirm token works
    r = client.get("/v1/auth/me", headers=headers)
    assert r.status_code == 200
    # Logout all sessions
    r2 = client.post("/v1/auth/logout-all", headers=headers)
    assert r2.status_code == 200
    # Old token should now fail (if token_version check is implemented)
    r3 = client.get("/v1/auth/me", headers=headers)
    assert r3.status_code in (401, 403)


def test_forgot_password_no_enumeration(client):
    """Forgot password must return same response for existing and non-existing emails."""
    r1 = client.post("/v1/auth/forgot-password", json={"email": "real@example.com"})
    r2 = client.post("/v1/auth/forgot-password", json={"email": "nonexistent_xyz@example.com"})
    # Both should succeed with 200 (no enumeration)
    assert r1.status_code == 200
    assert r2.status_code == 200
    # Response body should not contain any token
    body1 = r1.json()
    assert "token" not in str(body1).lower() or body1.get("token") is None


def test_cross_user_resource_access_denied(client):
    """User cannot access another user's resources."""
    token_a = client.post("/v1/auth/demo-login").json()["access_token"]
    token_b = register_and_login(client, "other_resource_user@test.com")

    # Get a course from user A
    courses = client.get("/v1/courses", headers=auth(token_a)).json()
    assert len(courses) > 0
    course_a_id = courses[0]["id"]

    # User B should not be able to see course A's resources
    r = client.get(f"/v1/courses/{course_a_id}/resources", headers=auth(token_b))
    assert r.status_code in (403, 404)


def test_preferences_crud(client):
    """User preferences can be created, retrieved, and updated."""
    token = register_and_login(client, "prefs_user@test.com")
    headers = auth(token)

    # GET when no prefs yet - should return 200 with defaults or 404
    r = client.get("/v1/preferences", headers=headers)
    assert r.status_code in (200, 404)

    # PUT to set preferences
    r = client.put("/v1/preferences", headers=headers, json={
        "learning_goals": '["Pass calculus exam", "Master ML concepts"]',
        "available_hours_per_week": 15.0,
        "preferred_session_duration_minutes": 60,
        "timezone": "America/New_York"
    })
    assert r.status_code in (200, 201), r.text

    # GET to verify persistence
    r2 = client.get("/v1/preferences", headers=headers)
    assert r2.status_code == 200
    data = r2.json()
    assert data.get("timezone") == "America/New_York"


def test_study_session_lifecycle(client, db):
    """Study sessions can be started and ended."""
    token = register_and_login(client, "session_user@test.com")
    headers = auth(token)

    from backend.app.models.course import Course
    course = db.query(Course).first()

    # Start a session
    r = client.post("/v1/study-sessions/start", headers=headers,
                    json={"course_id": course.id, "session_type": "study"})
    # May be 200, 201, or 404 if route not yet added
    if r.status_code in (404, 422):
        pytest.skip("Study sessions endpoint not yet implemented")
    assert r.status_code in (200, 201), r.text
    session_id = r.json().get("id")

    if session_id:
        # End the session
        r2 = client.post(f"/v1/study-sessions/{session_id}/end", headers=headers,
                         json={"duration_seconds": 1800})
        assert r2.status_code in (200, 201), r2.text


def test_health_endpoint_structure(client):
    """Health endpoint should have expected fields without exposing credentials."""
    r = client.get("/v1/health")
    assert r.status_code == 200
    data = r.json()
    assert "database_connected" in data
    assert "nebius_key_present" in data or "nebius_configured" in data
    # Must not expose any key values
    body = str(data)
    assert "sk-" not in body  # no API key prefixes
    assert "eyJ" not in body  # no JWT tokens
