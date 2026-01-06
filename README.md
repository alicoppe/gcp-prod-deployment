# Full‑Stack FastAPI + React Scaffolding (GCP‑ready)

This repo is a **full-stack starter** pairing a FastAPI backend (async SQLModel + Alembic) with a React + Tailwind frontend. It ships with Docker Compose for local dev/test, Terraform for Google Cloud production, and GitHub Actions for automated plan/apply.

## Why Use This Template?
- **Backend**: FastAPI (async), SQLModel, Alembic, JWT auth, Redis-backed cache/rate limits.
- **Frontend**: React + Vite + Tailwind placeholder wired to the API via Caddy locally and Cloud Run in prod.
- **Storage**: Local filesystem in dev; Google Cloud Storage with signed URLs in prod.
- **Background / Scheduling**: Cloud Scheduler → Pub/Sub → backend push handler (no Celery in prod).
- **Infra as Code**: Terraform modules for Cloud Run, Cloud SQL (Postgres), Memorystore (Redis), GCS bucket, Pub/Sub, Scheduler, Artifact Registry.
- **CI/CD**: GitHub Actions workflow that plans on PRs and applies on `main` using Workload Identity Federation.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Testing](#testing)
4. [Production on Google Cloud](#production-on-google-cloud)
5. [Background Jobs: Scheduler & Pub/Sub](#background-jobs-scheduler--pubsub)
6. [File Storage](#file-storage)
7. [Database IDs](#database-ids)
8. [Code Style & QA](#code-style--qa)
9. [CI/CD](#cicd)
10. [Updating Docs](#updating-docs)
11. [License](#license)

## Prerequisites
- Docker + Docker Compose
- Make (optional shortcuts)
- Python 3.10+ if running backend directly
- Node 20+ if running frontend directly

## Local Development
Run the stack (dev):
```sh
docker compose -f docker-compose-dev.yml up --build
```
Services (dev):
- FastAPI: http://fastapi.localhost/docs
- Frontend: http://app.localhost
- Static files: http://static.localhost
- Postgres: mapped to localhost:5454

Hot reload:
- Backend: Uvicorn `--reload`
- Frontend: Vite dev server

Testing “periodic” work locally (replaces Celery):
```sh
curl -X POST http://fastapi.localhost/api/v1/pubsub/push \
  -H "Content-Type: application/json" \
  -d '{"message":{"data":"'"$(echo -n '{"event":"scheduled","prompt":"Hello"}' | base64)"'"}}'
```

Storage in dev:
- Uses local filesystem at `static/uploads` (served via Caddy static host).

Frontend assets:
- React + Tailwind placeholder in `frontend/`. If running outside Compose, set `VITE_API_URL` accordingly.

## Testing
- Spin up test stack: `docker compose -f docker-compose-test.yml up`
- Run tests: `make pytest`

## Production on Google Cloud
Managed services used:
- **Cloud Run**: backend API, frontend static server
- **Cloud SQL (Postgres)**: primary database
- **Memorystore (Redis)**: caching / rate limiting
- **Cloud Storage**: user uploads and frontend assets (signed URLs)
- **Pub/Sub + Cloud Scheduler**: periodic/background triggers
- **Artifact Registry**: container images
- **Secret Manager**: secrets (recommended; wire via Cloud Run envs)

IaC:
- Terraform in `infra/terraform` provisions the above resources.
- Remote state: GCS bucket (set `tf_state_bucket`).

Deploy flow:
1) Build & push images to Artifact Registry.
2) `terraform plan` / `terraform apply` (locally or via GitHub Actions).
3) Run Alembic migrations (one-off Cloud Run job or exec into backend container).

## Background Jobs: Scheduler & Pub/Sub
- Periodic work: Cloud Scheduler → Pub/Sub → push to backend `/api/v1/pubsub/push`.
- No Celery/Beat in prod; local dev hits the same endpoint manually.

## File Storage
- Dev: local `static/uploads` (public via Caddy static host).
- Prod: GCS bucket; backend generates signed URLs.

## Database IDs
- Uses UUID7 for time-sortable unique IDs.

## Code Style & QA
- Format: `make formatter` (black)
- Lint: `make lint` (ruff)
- Type check: `make mypy`

## CI/CD
- GitHub Actions: `.github/workflows/infra.yml`
  - PR: terraform plan (artifact uploaded)
  - main: terraform apply (WIF auth)

## Updating Docs
- When architecture/services/workflows change, update this README and `AGENTS.md`.

## License
This project is licensed under the terms of the MIT license. See [LICENSE](LICENSE) for details.
