# Enterprise-AI

This repository is organized as a monorepo:

- `backend/` contains the Python API, ingestion worker, database script, and legacy HTML/CSS/JS UI.
- `backend/infra/` contains backend database infrastructure such as the PostgreSQL schema.
- `backend/.env` and `backend/.env.example` contain backend environment configuration.
- `frontend/` contains the React workspace scaffold for the future frontend migration.
- `venv/` is local development tooling and is not part of the application or deployment image.

The current deployment continues to build and serve the legacy UI from the Python backend. Run the database setup script from the repository root with:

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

Run backend authentication tests with:

```bash
venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
venv\Scripts\python.exe -m pytest backend/tests -q
```