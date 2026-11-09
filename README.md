# Enterprise-AI

This repository is organized as a monorepo:

- `backend/` contains the Python API (`app/`), ingestion worker, and database scripts.
- `backend/app/` is organized into `core/` (config, database, security), `routers/` (HTTP endpoints), and `services/` (business logic and RAG).
- `backend/infra/` contains backend database infrastructure such as the PostgreSQL schema.
- `backend/.env` and `backend/.env.example` contain backend environment configuration.
- `frontend/` contains the standalone Vite + React app (Knova UI) with its own `package.json` and `package-lock.json`; it is deployed to Vercel from that directory.
- `venv/` is local development tooling and is not part of the application or deployment image.

The backend serves the API only. Run the database setup script from the repository root with:

```bash
python backend/scripts/init_db.py
```

## Authentication

Authentication uses local usernames and passwords with Argon2 password hashes, short-lived JWT access tokens, and rotated refresh tokens stored in an HttpOnly cookie. Configure `JWT_SECRET_KEY` with a random value of at least 32 characters and set `AUTH_COOKIE_SECURE=true` in production.

After applying `backend/infra/schema.sql`, create users from the repository root:

```bash
python backend/scripts/create_user.py
```

The script accepts a username, tenant, role (`user` or `admin`), and password without storing the plaintext password. Public registration is disabled by default. The frontend keeps the access token in memory and automatically uses the refresh cookie when an access token expires.

To enable the user registration page locally, set `AUTH_ALLOW_REGISTRATION=true` in `backend/.env`. Keep it disabled in production unless registration is protected by an invitation or another onboarding control. Registered accounts always receive the `user` role; administrator accounts must be created with `create_user.py`.

## Deployment

The backend runs on the EC2 self-hosted runner as a Docker container published on port `8000` (public IP `100.31.148.108`). The frontend is deployed to Vercel at `https://knova-enterprise-ai.vercel.app`.

### Backend

- Set the repository secret `CORS_ORIGINS` to `https://knova-enterprise-ai.vercel.app` (comma-separate additional origins). It is injected into the container by `.github/workflows/cicd.yaml`.
- Set `AUTH_COOKIE_SECURE=true` in production.
- Allow inbound TCP `8000` in the EC2 security group for the hosts that must reach the API.
- Verify on the instance: `curl http://127.0.0.1:8000/health/live`.

### Frontend (Vercel)

- Set the Vercel project root directory to `frontend`; the framework preset is Vite.
- Use the default commands: install `npm install`, build `npm run build`, output directory `dist`.
- Set `VITE_API_URL=https://knova-enterprise-ai.vercel.app` in the Vercel project environment (mirrored in `frontend/.env.production`).
- There is no root `package.json` or npm workspace; install and build only from `frontend/`.
- Because `vercel.json` is not used, the Vercel project must proxy `/api/*` and `/health/*` to `http://100.31.148.108:8000` with project-level routing rules (Vercel Dashboard -> Project -> Routing). Without that proxy, requests hit Vercel and return 404.
- The browser only talks to the Vercel HTTPS origin, so mixed content and CORS are avoided.
- Verify after deploying: `curl https://knova-enterprise-ai.vercel.app/health/live`.

### S3 browser uploads

The bucket must allow the frontend origin for presigned `PUT` uploads. The policy is stored in `backend/infra/s3-cors.json`; apply it from the repository root with:

```bash
python backend/scripts/configure_s3_cors.py
```

The script reads `S3_BUCKET` from `backend/.env` and allows `https://knova-enterprise-ai.vercel.app` by default. Override it with a comma-separated `FRONTEND_ORIGINS` environment variable when needed.

### Direct HTTPS (optional)

To call the backend directly instead of through the Vercel proxy, terminate TLS in front of port `8000` (for example with Caddy or an ALB) and point `VITE_API_URL` at that `https://` origin. Cross-site refresh cookies then require `SameSite=None; Secure`, which needs an `AUTH_COOKIE_SAMESITE` setting in the backend.
