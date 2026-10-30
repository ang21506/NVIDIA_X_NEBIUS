# LearnLoop AI — Setup and Deployment Guide

> **Tutor name:** KEVIN (any legacy "JARVIS" references in older files are being cleaned up)  
> **Stack:** FastAPI · SQLAlchemy · Alembic · PostgreSQL/pgvector (Supabase) · React · Vite · TypeScript · Tailwind  
> **AI:** Nebius Token Factory — NVIDIA Nemotron model  
> **Auth:** Custom FastAPI JWT (NOT Supabase Auth)

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Environment Variables Reference](#2-environment-variables-reference)
3. [Database Migrations](#3-database-migrations)
4. [Production Deployment Checklist](#4-production-deployment-checklist)
5. [After API Keys Are Added](#5-after-api-keys-are-added)
6. [Security Notes](#6-security-notes)
7. [Migrations Requiring Supabase Approval](#7-migrations-requiring-supabase-approval)

---

## 1. Local Development Setup

### Prerequisites

- Python 3.11 or 3.12
- Node.js 20+
- Git

### Backend

```bash
# Clone and enter the repo
git clone https://github.com/ang21506/NVIDIA_X_NEBIUS.git
cd NVIDIA_X_NEBIUS

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows PowerShell
# source .venv/bin/activate     # macOS / Linux

# Install Python dependencies
pip install -r backend/requirements.txt

# Copy the example env and fill in your values
cp .env.example .env
# Edit .env — minimum required for local dev:
#   DATABASE_URL (SQLite default works out of the box)
#   JWT_SECRET   (generate one: python backend/generate_jwt_secret.py)

# Run with SQLite (AUTO_CREATE_TABLES=true, no Alembic needed)
uvicorn backend.app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev    # starts Vite at http://localhost:5173
```

### Generate a JWT Secret

```bash
python backend/generate_jwt_secret.py
# Copy the output JWT_SECRET=... line into your .env file
```

> **⚠️ WARNING:** Changing `JWT_SECRET` immediately invalidates **all** existing user sessions. Every user must re-authenticate. Schedule rotation during a maintenance window.

---

## 2. Environment Variables Reference

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `sqlite:///./backend/data/learnloop.db` | PostgreSQL for production |
| `MIGRATION_DATABASE_URL` | ✅ prod | (same as DATABASE_URL) | Use a migration-role URL with DDL rights |
| `APP_ENV` | ✅ | `development` | `production` enables startup validation |
| `AUTO_CREATE_TABLES` | — | `false` | `true` for SQLite dev only |
| `SEED_DEMO_DATA` | — | `false` | Seeds ML course on startup |
| `ENABLE_DEMO_MODE` | — | `false` | Enables `/v1/auth/demo-login` |
| `JWT_SECRET` | ✅ | *(placeholder)* | Min 32 chars, not containing "learnloop" in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | — | `10080` (7 days) | Reduce for sensitive deployments |
| `NEBIUS_API_KEY` | AI features | — | From [tokenfactory.nebius.com](https://tokenfactory.nebius.com) |
| `NEBIUS_BASE_URL` | — | `https://api.tokenfactory.nebius.com/v1/` | — |
| `NEBIUS_MODEL_ID` | — | `nvidia/Llama-3.1-Nemotron-70B-Instruct-HF` | — |
| `EMBEDDING_PROVIDER` | — | `local` | `openai-compatible` for production semantic search |
| `EMBEDDING_MODEL_ID` | — | `hash-v1` | Must NOT be `hash-v1` in production |
| `EMBEDDING_API_KEY` | prod | — | Required when `EMBEDDING_PROVIDER=openai-compatible` |
| `SUPABASE_URL` | storage | — | Never expose in frontend / `VITE_*` vars |
| `SUPABASE_SECRET_KEY` | storage | — | Never expose in frontend / `VITE_*` vars |
| `SUPABASE_STORAGE_BUCKET` | — | `course-materials` | Private bucket |
| `EMAIL_PROVIDER` | — | `log` | `log` prints to console; `smtp` sends real email |
| `EMAIL_FROM` | — | `noreply@learnloop.ai` | Sender address |
| `SMTP_HOST` | email | — | Required when `EMAIL_PROVIDER=smtp` |
| `SMTP_PORT` | — | `587` | — |
| `SMTP_TLS` | — | `true` | — |
| `SMTP_USER` | email | — | SMTP authentication username |
| `SMTP_PASSWORD` | email | — | SMTP authentication password |

> **Security rule:** Never put `SUPABASE_SECRET_KEY`, `NEBIUS_API_KEY`, `EMBEDDING_API_KEY`, or `JWT_SECRET` into `VITE_*` variables — they would be bundled into the browser build.

---

## 3. Database Migrations

### Local SQLite (development)

Set `AUTO_CREATE_TABLES=true` — SQLAlchemy creates all tables automatically on startup. No Alembic needed.

### PostgreSQL (Supabase — staging / production)

```bash
# Apply all pending migrations
python -m alembic upgrade head

# Check for schema drift (should print "No new upgrade operations detected")
python -m alembic check

# View migration history
python -m alembic history --verbose
```

> **Important:** Run `alembic upgrade head` **before** starting application workers. If you scale to multiple replicas, the migration step must complete first. Alembic applies migrations sequentially — running it in parallel on multiple nodes may cause conflicts.

### Least-Privilege Database Role

See [`backend/docs/db_role_setup.sql`](backend/docs/db_role_setup.sql) for reviewed SQL to create a restricted `learnloop_app` runtime role and a separate `learnloop_migrator` DDL role. **Do not apply to Supabase without explicit approval.**

---

## 4. Production Deployment Checklist

The backend validates these at startup when `APP_ENV=production` and will refuse to start if any check fails.

- [ ] `APP_ENV=production`
- [ ] `JWT_SECRET` — min 32 chars, generated with `python backend/generate_jwt_secret.py`, not the placeholder
- [ ] `DATABASE_URL` points to PostgreSQL (Supabase)
- [ ] `MIGRATION_DATABASE_URL` uses a migration role with DDL rights
- [ ] `alembic upgrade head` run **before** starting workers
- [ ] `AUTO_CREATE_TABLES=false` (enforced by startup check)
- [ ] `SEED_DEMO_DATA=false` and `ENABLE_DEMO_MODE=false` (enforced)
- [ ] `EMBEDDING_PROVIDER=openai-compatible` and `EMBEDDING_MODEL_ID` is not `hash-v1`
- [ ] `NEBIUS_API_KEY` set (AI tutor + quiz generation)
- [ ] `EMBEDDING_API_KEY` set (semantic document search)
- [ ] `SUPABASE_URL` + `SUPABASE_SECRET_KEY` set (private file storage)
- [ ] `EMAIL_PROVIDER=smtp` with valid SMTP credentials (password reset / email verify)
- [ ] HTTPS termination at the load balancer / reverse proxy
- [ ] CORS origins locked down (`CORS_ORIGINS` in config)
- [ ] Rate limiting configured at the reverse proxy or via Redis-backed slowapi

### Rate Limiting

> **⚠️ Important:** The built-in in-memory rate limiting does **not** work across multiple application workers. For multi-instance production deployments, configure rate limiting at your reverse proxy (nginx, Caddy, Cloudflare) or add Redis-backed rate limiting (e.g., `slowapi` + Redis) before public exposure.

### HTTPS / Reverse Proxy (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 30M;  # match MAX_UPLOAD_SIZE_MB
    }

    location / {
        root /var/www/learnloop;
        try_files $uri /index.html;
    }
}
```

---

## 5. After API Keys Are Added

Work to complete once real credentials are available:

### NEBIUS_API_KEY (AI Tutor + Quiz Generation)

- [ ] Smoke test: `curl -X POST /v1/tutor/ask` with a real question → expect model-generated response
- [ ] Verify citations reference actual document chunks (not hallucinated IDs)
- [ ] Test quiz generation (`POST /v1/quizzes/generate`) returns valid structured JSON
- [ ] Confirm error handling when quota is exhausted (should return 503, not 500)
- [ ] Run a load test with realistic concurrency before public launch

### EMBEDDING_API_KEY (Semantic Search)

- [ ] Validate model name matches `EMBEDDING_DIMENSION` (e.g., `BAAI/bge-en-icl` = 4096 dims)
- [ ] Run reindex: `python -m backend.scripts.reindex --dry-run` to preview scope
- [ ] Run actual reindex: `python -m backend.scripts.reindex` (check progress and resumability)
- [ ] Confirm existing hash-v1 vectors are replaced (incompatible — must not be mixed)
- [ ] Add pgvector index after reindex: `CREATE INDEX ... USING ivfflat` (check dimension compatibility)
- [ ] Verify `/v1/tutor/ask` citations now point to semantically relevant chunks

### SMTP Credentials (Email Verification + Password Reset)

- [ ] Set `EMAIL_PROVIDER=smtp` and configure `SMTP_*` variables
- [ ] Send a test password reset — confirm email arrives and link works end-to-end
- [ ] Confirm token is NOT returned in API response body (only delivered by email)
- [ ] Test token expiry (1 hour) and single-use enforcement

### End-to-End Staging Validation

- [ ] Register a new account → receive verification email → verify → log in
- [ ] Upload a PDF → wait for indexing → ask a question → receive citations
- [ ] Generate a quiz → submit answers → review results
- [ ] Verify logout-all invalidates all tokens across multiple browser tabs

---

## 6. Security Notes

### JWT Secret Rotation

Changing `JWT_SECRET` **immediately and silently** invalidates every active session. All logged-in users are signed out with no warning. Before rotating:

1. Notify users (in-app banner, email)
2. Schedule rotation during low-traffic window
3. Update the secret in all deployment environments atomically
4. Monitor 401 error rates after rotation

### Supabase Data API Exposure

Tables in the `public` schema are accessible via the Supabase REST API by default. LearnLoop uses custom FastAPI JWTs — `auth.uid()` is always NULL for backend requests, so standard RLS policies do not apply.

See [`backend/docs/db_role_setup.sql`](backend/docs/db_role_setup.sql) for recommended RLS and privilege changes. **Do not apply without approval.**

### Audio File Security

Voice recordings are served only to authenticated users who own them (verified via `AudioMessage.user_id` ownership check). Object URLs created from authenticated fetches must be revoked on component cleanup.

---

## 7. Migrations Requiring Supabase Approval

The following new migrations **must not be applied to the hosted Supabase database** without explicit DBA / project-owner approval:

| Migration | Description | Risk |
|---|---|---|
| `0004_session_security` | Adds `token_version`, `is_email_verified`, `email_verified_at` to `users`; creates `auth_tokens` table | `ALTER TABLE users` — requires brief lock; no data loss |
| `0005_user_preferences` | Creates `user_preferences` and `study_sessions` tables | New tables only — low risk |
| `0006_processing_jobs` | Creates `processing_jobs` table for durable background jobs | New table only — low risk |

Apply order: `0004` → `0005` → `0006` (Alembic handles this via `down_revision` chain).

```bash
# Apply all pending migrations
python -m alembic upgrade head
```

