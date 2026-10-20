from types import SimpleNamespace
import pytest
import httpx
from backend.app.config import settings
from backend.app.services.storage_service import StorageService
from backend.app.services.embedding_service import EmbeddingService


def test_supabase_requests_stay_private(monkeypatch):
    monkeypatch.setattr(settings, 'STORAGE_PROVIDER', 'supabase')
    monkeypatch.setattr(settings, 'SUPABASE_URL', 'https://project.example')
    monkeypatch.setattr(settings, 'SUPABASE_SECRET_KEY', 'sb_secret_test')
    calls = []
    def request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        return httpx.Response(200, content=b'notes', request=httpx.Request(method, url))
    monkeypatch.setattr(httpx, 'request', request)
    location = StorageService.save('user/course/resource.txt', b'notes', 'text/plain')
    assert location == 'supabase://course-materials/user/course/resource.txt'
    assert StorageService.read(location) == b'notes'
    StorageService.delete(location)
    assert '/object/authenticated/' in calls[1][1]
    assert calls[0][2]['headers']['x-upsert'] == 'false'
    assert calls[2][2]['json'] == {'prefixes': ['user/course/resource.txt']}
    assert all(call[2]['headers']['apikey'] == 'sb_secret_test' for call in calls)


def test_embedding_dimension_mismatch_rejected(monkeypatch):
    import openai
    class Client:
        def __init__(self, **kwargs):
            self.embeddings = self
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def create(self, **kwargs):
            return SimpleNamespace(data=[SimpleNamespace(index=0, embedding=[1.0, 0.0])])
    monkeypatch.setattr(openai, 'OpenAI', Client)
    monkeypatch.setattr(settings, 'EMBEDDING_PROVIDER', 'openai-compatible')
    with pytest.raises(ValueError, match='dimensions'):
        EmbeddingService.get_embedding('some text')


def test_production_rejects_demo_embeddings(monkeypatch):
    monkeypatch.setattr(settings, 'APP_ENV', 'production')
    with pytest.raises(RuntimeError, match='semantic'):
        EmbeddingService.get_embedding('some text')
