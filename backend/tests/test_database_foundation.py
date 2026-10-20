import json
import pytest
from sqlalchemy.exc import IntegrityError
from backend.app.models.assessment import QuizAttempt, QuizItem, QuizAnswer
from backend.app.models.learning_event import MasteryEvent
from backend.app.models.topic import MasteryState
from backend.app.models.course import Course
from backend.app.models.user import User
from backend.app.services.quiz_service import QuizService
from backend.app.services.planner_service import PlannerService
from backend.app.schemas.quiz import QuizSubmitRequest
from backend.app.services.document_service import DocumentService


def login(client):
    token = client.post('/v1/auth/demo-login').json()['access_token']
    return {'Authorization': f'Bearer {token}'}


def payload(db):
    item = db.query(QuizItem).first()
    return {'course_id': item.course_id, 'idempotency_key': 'request-12345678',
            'answers': [{'quiz_item_id': item.id, 'selected_answer': item.correct_answer}]}


def test_quiz_retry_preserves_evidence(client, db):
    headers = login(client)
    body = payload(db)
    first = client.post('/v1/quizzes/submit', headers=headers, json=body)
    assert first.status_code == 200, first.text
    second = client.post('/v1/quizzes/submit', headers=headers, json=body)
    assert second.json() == first.json()
    assert db.query(QuizAttempt).count() == 1
    assert db.query(MasteryEvent).count() == 1
    body['answers'][0]['selected_answer'] = 'changed'
    assert client.post('/v1/quizzes/submit', headers=headers, json=body).status_code == 409


def test_duplicate_and_foreign_questions_leave_no_attempt(client, db):
    headers = login(client)
    body = payload(db)
    body['answers'] *= 2
    assert client.post('/v1/quizzes/submit', headers=headers, json=body).status_code == 400
    body['answers'] = [{'quiz_item_id': 'unknown', 'selected_answer': 'x'}]
    assert client.post('/v1/quizzes/submit', headers=headers, json=body).status_code == 400
    assert db.query(QuizAttempt).count() == 0


def test_planner_failure_rolls_back_assessment(client, db, monkeypatch):
    headers = login(client)
    before = [(m.id, m.mastery_score, m.evidence_count) for m in db.query(MasteryState).all()]
    def fail(*args, **kwargs):
        raise RuntimeError('simulated planner failure')
    monkeypatch.setattr(PlannerService, 'recalculate_course_plan', fail)
    with pytest.raises(RuntimeError, match='simulated'):
        client.post('/v1/quizzes/submit', headers=headers, json=payload(db))
    assert db.query(QuizAttempt).count() == 0
    assert db.query(QuizAnswer).count() == 0
    assert db.query(MasteryEvent).count() == 0
    assert before == [(m.id, m.mastery_score, m.evidence_count) for m in db.query(MasteryState).all()]


def test_private_upload_download_and_delete(client, db):
    headers = login(client)
    course = db.query(Course).first()
    content = b'Linear algebra explains vectors, matrices and transformations.'
    response = client.post('/v1/resources/upload', headers=headers,
                           data={'course_id': course.id}, files={'file': ('../notes.txt', content, 'text/plain')})
    assert response.status_code == 201, response.text
    resource = response.json()
    assert resource['status'] == 'INDEXED'
    assert resource['filename'] == 'notes.txt'
    url = f"/v1/resources/{resource['id']}/download"
    assert client.get(url).status_code in (401, 403)
    other = client.post('/v1/auth/register', json={'email': 'other@example.com', 'password': 'Password123!', 'full_name': 'Other'}).json()
    assert client.get(url, headers={'Authorization': f"Bearer {other['access_token']}"}).status_code == 404
    assert client.get(url, headers=headers).content == content
    assert client.delete(f"/v1/resources/{resource['id']}", headers=headers).status_code == 204
    assert client.get(url, headers=headers).status_code == 404


def test_database_rejects_cross_user_course_link(db):
    from backend.app.models.resource import Resource
    course = db.query(Course).first()
    other = User(email='second@example.com', hashed_password='unused', full_name='Other')
    db.add(other)
    db.flush()
    db.add(Resource(user_id=other.id, course_id=course.id, filename='x', file_path='x', file_size=1))
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_invalid_chunk_overlap():
    with pytest.raises(ValueError):
        DocumentService.chunk_text('some words', chunk_size=2, overlap=2)


def test_demo_endpoints_disabled_when_flag_is_off(client, monkeypatch):
    from backend.app.config import settings
    headers = login(client)
    monkeypatch.setattr(settings, 'ENABLE_DEMO_MODE', False)
    assert client.post('/v1/auth/demo-login').status_code == 404
    assert client.post('/v1/settings/reset-demo', headers=headers).status_code == 403
    # Disabling demo entry does not disable existing authenticated accounts.
    assert client.get('/v1/auth/me', headers=headers).status_code == 200
