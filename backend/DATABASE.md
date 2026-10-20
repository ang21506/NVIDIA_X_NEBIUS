# JARVIS database implementation

The backend now supports PostgreSQL via psycopg, Alembic migrations, pgvector
retrieval, optional private Supabase document storage, database ownership foreign
keys, and transaction-safe assessment history. SQLite remains a local development
option. The frontend and existing API response shapes are preserved.

## Local setup (PowerShell, repository root)

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
# Copy only when .env does not already exist:
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m alembic upgrade head
# Optional local demonstration:
.\.venv\Scripts\python.exe -m backend.manage seed-demo
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --port 8000
```

Startup validates the migration revision. AUTO_CREATE_TABLES is an opt-in SQLite
development escape hatch, not an upgrade mechanism. SEED_DEMO_DATA defaults off.
Public demo UI has been removed. ENABLE_DEMO_MODE defaults off and gates demo
login/reset endpoints; automatic seeding requires both demo flags. Test fixtures
may opt in explicitly. Existing accounts are not deleted when these flags change.
Docker Compose is a local development setup with development credentials; it runs
migrations before starting its single backend container. In production run
migrations once as a release job before starting application replicas.

## Supabase setup

1. Create a development project and a separate production project.
2. Copy a PostgreSQL connection string from Connect. Use a direct connection for
   migrations where available. For an IPv4-only host, use a supported session
   pooler connection. Do not blindly substitute transaction-pooler port 6543 for
   migrations. URL-encode special characters in the password.
3. Use postgresql+psycopg:// as the SQLAlchemy scheme. Set DATABASE_URL for the
   runtime and MIGRATION_DATABASE_URL for the migration connection. Enable TLS;
   configure sslmode=verify-full with the provider CA for identity verification.
4. Keep application tables out of exposed Data API schemas, or disable that API
   if unused. The browser talks to FastAPI. Custom FastAPI JWTs do not automatically
   populate Supabase auth.uid(). No browser database access is implemented.
5. Give migrations a schema-owner role. Give runtime a separate restricted role
   with only necessary table/sequence permissions. The current app enforces user
   scope; composite foreign keys also reject cross-owner references. These are
   not row-level SELECT policies. RLS requires a separate tested integration.
6. Create a PRIVATE bucket named course-materials. Configure PDF/TXT/MD uploads
   and a 25 MB limit (or match MAX_UPLOAD_SIZE_MB).
7. Set STORAGE_PROVIDER=supabase, SUPABASE_URL, SUPABASE_SECRET_KEY and
   SUPABASE_STORAGE_BUCKET in the server .env or deployment secret manager.
   The server key is privileged: never expose it through VITE_* or client code.
8. Set EMBEDDING_PROVIDER=openai-compatible, EMBEDDING_MODEL_ID to an available
   embedding model, EMBEDDING_BASE_URL and EMBEDDING_API_KEY. The embedding key
   defaults to NEBIUS_API_KEY when omitted. Match EMBEDDING_DIMENSION to the
   model's actual output. The chat model is a separate setting.
9. Run alembic upgrade head using the migration role. Revision 0002 enables vector;
   an administrator may need to enable it first if extension creation is restricted.
10. Set APP_ENV=production, a unique random JWT_SECRET, AUTO_CREATE_TABLES=false
    and SEED_DEMO_DATA=false. Production rejects SQLite, demo hashing and demo login.
    Complete the launch checklist below before allowing public users.

Official references:
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/ai/vector-columns
- https://supabase.com/docs/guides/storage/buckets/fundamentals

## Existing databases and embeddings

Do not run a baseline CREATE migration over an existing unversioned database.
Back up and restore to a staging database first, compare its schema to revision
0001, and stamp 0001 only after confirming an exact baseline match. Then upgrade.
Migration failures on duplicate answers/chunks or invalid ownership deliberately
stop instead of silently deleting learning evidence. Resolve those records after
review. SQLite-to-Postgres data transfer is not automated by these migrations.

Legacy embedding_json values are retained. PostgreSQL search uses the new vector
column, and filters model ID and dimension so incompatible embeddings never mix.
Reindex legacy documents after migration and whenever the embedding model changes:

```powershell
.\.venv\Scripts\python.exe -m backend.manage reindex --user-id USER_UUID
```

The vector column is dimension-flexible and initially uses exact cosine search.
After selecting a fixed production model, benchmark filtered queries and add an
appropriate dimension-specific HNSW index in a new migration if needed. This
implementation does not claim an ANN performance improvement yet.

## New behavior

- Upload paths are generated from user/course/resource IDs, not supplied filenames.
- GET /v1/resources/{id}/download checks ownership and proxies private bytes.
- Empty/unreadable documents fail indexing instead of appearing ready.
- Supabase object deletion failures preserve tracking records for retry.
- Quiz submissions reject duplicates and unknown/foreign questions before writes.
- Pass an idempotency_key (8–128 characters) with a quiz submission. Reuse it only
  when retrying the same payload. A changed payload returns 409. It is optional for
  old clients; callers must supply it to receive retry protection.
- A course row lock serializes PostgreSQL assessments. Scoring, history and planner
  writes share one commit; planner failures roll back the assessment.
- mastery_events links each score change to its quiz answer. Learning-data reset
  also deletes those events. Exports include assessment and conversation records.
- Production demo-login/reset and weak password-hash fallback are disabled.

## Validation

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q --disable-warnings
.\.venv\Scripts\python.exe -m alembic check
```

Tests use isolated databases and temporary uploads, never the developer database.
They cover migration upgrade/downgrade, PostgreSQL SQL rendering, owner constraints,
quiz retries/rollback, private document access, and mocked remote integrations.
Real Supabase storage/inference still needs a credentialed end-to-end test.

For a dedicated PostgreSQL test database with pgvector available, set
TEST_POSTGRES_URL to its psycopg connection URL and rerun pytest. The optional
live test creates and removes a random jarvis_test_* schema, executes migrations,
seeds sample records, queries vectors, checks tenant filtering, and downgrades.
Use only a disposable test database: extension creation requires suitable privileges.
Without that variable, the live test is explicitly skipped.

## Work still required before public production launch

- Run live PostgreSQL integration/concurrency tests and a staging backup/restore
  drill. Offline SQL rendering is not a substitute for executing migrations.
- Implement durable ingestion jobs, retries and a cleanup outbox. Current uploads
  index synchronously. Storage and database writes are not a distributed transaction;
  a crash between them can leave an orphan object that needs reconciliation.
- Add email verification, password reset, rate limits and session revocation, or
  migrate authentication consistently to Supabase Auth. Legacy SHA256-only accounts
  need a secure password reset; they are no longer accepted as valid hashes.
- Add complete account deletion, audio cleanup, asynchronous exports for large
  accounts, and explicit retention handling including backups. Learning reset is
  not account deletion; the API no longer claims zero-residue deletion.
- Normalize misconception evidence and citations into dedicated history tables;
  the existing fields remain compatible with the current UI.
- Add preferences/study-session persistence, verified study-time analytics, scoped
  agent permissions and production monitoring. These are separate application work.

No hosted project is created, no credentials are generated or committed, and no
claim of production readiness is implied by setting APP_ENV=production.
