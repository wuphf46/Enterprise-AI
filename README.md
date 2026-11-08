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