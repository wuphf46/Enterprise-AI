# Knova (Enterprise AI)

Knova is a multi-tenant enterprise knowledge assistant. Users upload documents to a workspace, ingest them into a vector index, and ask natural-language questions that are answered from authorized documents with citations. The project pairs a FastAPI backend with a standalone React/Vite frontend.

## Features

- **Authentication** with Argon2 password hashes, short-lived JWT access tokens, and rotating refresh tokens in an `HttpOnly` cookie.
- **Multi-tenant isolation** with tenant scopes, user groups, and admin roles enforced in SQL and vector queries.
- **Document ingestion** for PDF, DOCX, TXT, and MD via presigned S3 uploads, followed by parsing, chunking, embedding, and Pinecone upserts.
- **Retrieval-augmented chat** built with LangGraph: guardrails, ACL-aware retrieval, evidence-grounded generation, citations, and a no-evidence path.
- **Guardrails** for prompt-injection/secret requests on input and sensitive-data detection on output, with audit events.
- **Human-in-the-loop approvals** for destructive requests (delete, export, send to, update policy) when HITL is enabled.
- **Feedback and admin metrics** for documents, ratings, and guardrail events.
- **Knova UI** with chat, documents, admin, and approvals pages.

## Technology stack

**Backend**
- Python 3.12, FastAPI, Uvicorn
- Pydantic Settings for environment configuration
- PostgreSQL via `psycopg`
- Amazon Bedrock (Titan embeddings, Nova chat) via `boto3`
- Pinecone for vector search
- LangGraph for the RAG pipeline
- `pypdf` and `python-docx` for document parsing
- PyJWT and `pwdlib[argon2]` for authentication

**Frontend**
- React 19, TypeScript, Vite 6
- React Router 7, TanStack Query 5, Zustand 5
- Axios, Tailwind CSS 3, lucide-react

**Infrastructure**
- Docker image built and pushed to Amazon ECR
- GitHub Actions CI/CD, self-hosted EC2 runner for deployment
- Vercel for the frontend

## Backend architecture

- `app/core/config.py` loads settings from `backend/.env` (or process environment) via Pydantic Settings.
- `app/core/db.py` opens PostgreSQL connections and provides the audit helper.
- `app/core/security.py` handles password hashing, access tokens, refresh tokens, and the refresh cookie.
- `app/core/aws.py` creates cached boto3 clients for S3 and Bedrock.
- `app/core/principal.py` defines the immutable `Principal` (subject, tenant, groups, admin).
- `app/deps.py` verifies JWTs, reloads the user from the database, and enforces admin access.
- `app/routers/` contains thin HTTP handlers; business logic lives in `app/services/`.
- `app/services/rag/` contains the LangGraph pipeline, LLM wrappers, Pinecone access, conversation memory, and guardrails.

## RAG chat flow

1. `POST /api/chat` validates input with the guardrail classifier and records blocked attempts.
2. When HITL is enabled and the question matches destructive intents, an approval record is created and a `pending_approval` response is returned.
3. The LangGraph pipeline runs: `guard -> retrieve -> (generate -> validate) | no_evidence`.
4. `retrieve` embeds the question (with the previous user question for follow-ups) and queries Pinecone using an ACL filter for tenant, groups, and owner.
5. Hits below `MIN_RELEVANCE` are discarded. If nothing remains, the answer is a fixed no-evidence response.
6. `generate` asks Bedrock to answer using only the supplied evidence and cite passages as `[1]`, `[2]`.
7. `validate` blocks responses that appear to contain secrets or credentials.
8. The user/assistant turn is persisted, and the response includes `conversation_id`, `sources`, and `status`.

## Document ingestion flow

1. `POST /api/documents/uploads` records the document and returns a presigned S3 `PUT` URL plus headers.
2. The browser uploads the file directly to S3.
3. `POST /api/documents/complete` triggers synchronous ingestion in `worker/ingest.py`.
4. The worker parses the file, splits it into overlapping chunks, embeds each chunk, and upserts vectors with metadata (`document_id`, `title`, `page`, `text`, `owner_sub`, `allowed_groups`).
5. Document status moves through `pending`, `processing`, `ready`, or `failed`.

Allowed upload types are PDF, DOCX, TXT, and MD. PDFs must have a valid `%PDF` header, and uploads are limited by `MAX_UPLOAD_BYTES` (default 10 MiB).

## Data model

`backend/infra/schema.sql` defines:

- `users` — usernames, Argon2 hashes, tenant, role, groups, disabled flag.
- `refresh_tokens` — hashed refresh tokens with expiry and revocation.
- `documents` — tenant, owner, ACL groups, S3 key, status, version.
- `feedback` — tenant, actor, rating, note.
- `audit_events` — actor, tenant, action, JSON detail.
- `approvals` — HITL requests and reviewer decisions.
- `chat_messages` and `conversations` — persistent short-term conversation memory.

## API reference

**Auth**
- `POST /api/auth/login`
- `POST /api/auth/register` (only when `AUTH_ALLOW_REGISTRATION=true`)
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

**Documents**
- `POST /api/documents/uploads`
- `POST /api/documents/complete`
- `GET /api/documents`
- `DELETE /api/documents/{document_id}` (admin only)

**Chat**
- `POST /api/chat`
- `GET /api/conversations/{conversation_id}/messages`

**Feedback**
- `POST /api/feedback`

**Approvals (admin only)**
- `GET /api/approvals`
- `POST /api/approvals/{approval_id}/decision`

**Admin (admin only)**
- `GET /api/admin/metrics`
- `GET /api/admin/guardrails`

**Health**
- `GET /health/live`
- `GET /health/ready` (checks PostgreSQL connectivity)

Interactive API documentation is served at `/api/docs`.

## Configuration

Copy `backend/.env.example` to `backend/.env` and fill in the values.

| Variable | Purpose |
| --- | --- |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | AWS credentials and region |
| `S3_BUCKET` | Bucket for uploaded documents |
| `BEDROCK_EMBED_MODEL`, `BEDROCK_CHAT_MODEL`, `EMBED_DIM` | Bedrock model and embedding dimension |
| `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `PINECONE_CLOUD`, `PINECONE_REGION`, `PINECONE_READY_TIMEOUT` | Pinecone configuration |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE` | JWT signing and validation |
| `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS` | Token lifetimes |
| `AUTH_COOKIE_SECURE` | `Secure` flag on the refresh cookie (enable under HTTPS) |
| `AUTH_ALLOW_REGISTRATION` | Enables public self-registration |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API directly |
| `HITL_ENABLED`, `MEMORY_TURNS` | Approval routing and conversation memory depth |
| `MIN_RELEVANCE`, `MAX_UPLOAD_BYTES` | Retrieval threshold and upload limit |

The frontend uses one optional variable, `VITE_API_URL`. Leave it empty to call the API on the same origin (local Vite proxy or the Vercel proxy). Do not point it at a plain HTTP backend from an HTTPS page.

## Local development

### Prerequisites

- Python 3.12
- Node.js 20+ and npm
- PostgreSQL with the schema applied
- AWS credentials with S3 and Bedrock permissions
- A Pinecone account and index

### Backend

```bash
python -m venv venv
venv\Scripts\activate
python -m pip install -r backend/requirements.txt
copy backend\.env.example backend\.env
python backend/scripts/init_db.py
python backend/scripts/create_user.py
uvicorn app.main:app --app-dir backend --reload --port 8000
```


### Frontend

The frontend is an independent Vite application with its own `package.json` and `package-lock.json`; there is no root npm workspace.

```bash
cd frontend
npm install
npm run dev
npm run typecheck
npm run build
```

During development, Vite proxies `/api` and `/health` to the local backend on port 8000, so no CORS configuration is required.

### S3 browser uploads

The bucket must allow the frontend origin for presigned `PUT` uploads. The policy lives in `backend/infra/s3-cors.json` and can be applied with:

```bash
python backend/scripts/configure_s3_cors.py
```

The script reads `S3_BUCKET` from `backend/.env` and accepts a comma-separated `FRONTEND_ORIGINS` override.

## Authentication model

- Access tokens are short-lived JWTs (HS256) kept only in frontend memory.
- Refresh tokens are random values, hashed in PostgreSQL, rotated on every refresh, and delivered in an `HttpOnly` cookie scoped to `/api/auth`.
- On a `401`, the frontend refreshes once and retries the request.
- Public registration is disabled by default. Registered accounts always receive the `user` role; administrators must be created with `create_user.py`.
- `AUTH_COOKIE_SECURE` should be enabled whenever the app is served over HTTPS.

## Deployment

### Backend

- The `Dockerfile` installs `backend/requirements.txt`, copies the backend, runs as a non-root user, and serves `app.main:app` on port 8000.
- `.dockerignore` excludes `.env` files, virtual environments, caches, and frontend build artifacts, so secrets are not baked into the image.
- `.github/workflows/cicd.yaml` compiles the Python packages, builds and pushes an image tagged with the commit SHA to ECR, then deploys it on the self-hosted EC2 runner.
- Runtime configuration is injected from GitHub Actions secrets; the deployment validates required secrets before starting the container.
- The deployment verifies the container is running and `/health/live` responds.

Enable HTTPS in front of the backend (for example a reverse proxy or load balancer) before exposing it publicly, and restrict the port with the host firewall or security group.

### Frontend

- Deploy from the `frontend` directory with the Vite preset; use `npm install`, `npm run build`, and `dist` as the output directory.
- Keep `VITE_API_URL` empty. `frontend/vercel.json` proxies `/api/*`, `/health/*`, and `/openapi.json` to the backend address, so the browser only talks to the frontend origin over HTTPS (no mixed content, no CORS).
- Update the rewrite destination in `frontend/vercel.json` to match the backend address.
- The client also ignores a plain-HTTP `VITE_API_URL` value on HTTPS pages as a safeguard.

### CI/CD summary

1. **Integration** — checkout, set up Python, run `python -m compileall` over `backend/app`, `backend/worker`, and `backend/scripts`.
2. **Delivery** — build the Docker image and push it to ECR.
3. **Deployment** — pull the image on the EC2 self-hosted runner, validate secrets, replace the container, and verify health.

## Security notes

- Tenant and group checks are enforced in both SQL queries and Pinecone filters.
- Guardrails are deterministic, conservative demo rules; they complement, but do not replace, IAM and network controls.
- Output guardrails block private keys, AWS key patterns, and secret-like assignments.
- Approvals are decision records only and never automatically execute destructive actions.
- Keep `AUTH_ALLOW_REGISTRATION=false`, `AUTH_COOKIE_SECURE=true`, and a strong `JWT_SECRET_KEY` in production.
- Never commit `backend/.env` or any credentials.

## Verification checklist

```bash
python -m compileall -q backend/app backend/worker backend/scripts
cd frontend && npm run typecheck && npm run build
```

Then confirm `/health/live` and `/health/ready` return healthy responses from the running backend.
