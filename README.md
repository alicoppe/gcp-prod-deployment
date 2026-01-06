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
4. [Pre-Apply Setup](#pre-apply-setup)
5. [Build & Push Images](#build--push-images)
6. [Secrets (Secret Manager)](#secrets-secret-manager)
7. [Terraform Layout & Apply](#terraform-layout--apply)
8. [Production on Google Cloud](#production-on-google-cloud)
9. [Background Jobs: Scheduler & Pub/Sub](#background-jobs-scheduler--pubsub)
10. [File Storage](#file-storage)
11. [Database IDs](#database-ids)
12. [Code Style & QA](#code-style--qa)
13. [CI/CD](#cicd)
14. [Per-Resource Knobs](#per-resource-knobs)
15. [Infra Breakdown](#infra-breakdown)
16. [Updating Docs](#updating-docs)
17. [License](#license)

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

## Pre-Apply Setup
Do these once per project/env before `terraform init`:

1) Terraform state bucket (must be globally unique across all GCS buckets):
```sh
gsutil mb -l us-central1 gs://tf-state-<unique-name>
```
Use different names per env if you like (e.g., `tf-state-dev-<id>`, `tf-state-prod-<id>`) and update the backend block in `infra/terraform/envs/dev/main.tf` and `infra/terraform/envs/prod/main.tf`.

2) Create DB password in Secret Manager (managed by you):
```sh
gcloud secrets create db-password --replication-policy=automatic
echo -n "YOUR_STRONG_DB_PASSWORD" | gcloud secrets versions add db-password --data-file=-
```

Terraform loads this secret directly (see `envs/dev|prod/main.tf` data source), so you don't need to keep the DB password in tfvars.

3) Fill per-env tfvars (git-ignored):
- `infra/terraform/envs/dev/terraform.tfvars`
- `infra/terraform/envs/prod/terraform.tfvars`

Set:
- `project_id` (dev: dev-deployment-483516, prod: prod-deployment-483516)
- `region` / `vertex_region` (default `us-central1`)
- `backend_image` / `frontend_image` (Artifact Registry URLs)
- Optional: `allowed_origins`

4) Lock down the Terraform state buckets (example commands with your project IDs)
```sh
# Enable uniform bucket-level access and versioning
gsutil uniformbucketlevelaccess set on gs://tf-state-dev-deployment-483516
gsutil versioning set on gs://tf-state-dev-deployment-483516
gsutil uniformbucketlevelaccess set on gs://tf-state-prod-deployment-483516
gsutil versioning set on gs://tf-state-prod-deployment-483516

# Grant only your CI/service account access to state (replace SA email if different)
gcloud storage buckets add-iam-policy-binding gs://tf-state-dev-deployment-483516 \
  --member="serviceAccount:terraform-dev@dev-deployment-483516.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
gcloud storage buckets add-iam-policy-binding gs://tf-state-prod-deployment-483516 \
  --member="serviceAccount:terraform-prod@prod-deployment-483516.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```
Notes: bucket names must remain globally unique; GCS backend has no state locking—serialize applies (e.g., one CI pipeline at a time).

## Build & Push Images
Artifact Registry (recommended). Example for `us-central1` and repo `app`:
```sh
gcloud auth configure-docker us-central1-docker.pkg.dev
# Backend
docker build -t us-central1-docker.pkg.dev/PROJECT_ID/app/backend:dev -f backend/Dockerfile backend
docker push us-central1-docker.pkg.dev/PROJECT_ID/app/backend:dev
# Frontend
docker build -t us-central1-docker.pkg.dev/PROJECT_ID/app/frontend:dev -f frontend/Dockerfile frontend
docker push us-central1-docker.pkg.dev/PROJECT_ID/app/frontend:dev
```
Set these tags in `infra/terraform/envs/<env>/terraform.tfvars` as `backend_image` / `frontend_image`.

## Secrets (Secret Manager)
Create secrets (examples):
```sh
gcloud secrets create db-password --replication-policy=automatic
echo -n "your-db-password" | gcloud secrets versions add db-password --data-file=-
```
Do likewise for `secret-key`, `encrypt-key`, `openai-key`, etc. Keep values out of git and TF state. Best practice: mount secrets into Cloud Run via secret env vars (module can be extended) or set runtime envs manually after deploy. Note: the DB password is read from Secret Manager by Terraform (`data "google_secret_manager_secret_version"`), so it does not need to live in tfvars.

## Terraform Layout & Apply
Structure:
- `infra/terraform/globals`: providers/versions
- `infra/terraform/modules`: reusable modules (artifact_registry, sql_postgres, redis_memorystore, storage_gcs, pubsub_scheduler, cloud_run_services, vertex_ai, iam_secret_access)
- `infra/terraform/envs/dev` and `envs/prod`: per-env roots and state

Fill in (per env `terraform.tfvars`, not committed):
- `project_id`, `region`, `vertex_region`
- `backend_image`, `frontend_image` (Artifact Registry URLs)
- `db_password` (sensitive)
- `allowed_origins` if overriding defaults

Run:
```sh
cd infra/terraform/envs/dev
terraform init           # update backend bucket name first
terraform plan -var-file=terraform.tfvars
terraform apply
```
Repeat for prod.

## Production on Google Cloud
Managed services used:
- **Cloud Run**: backend API, frontend static server
- **Cloud SQL (Postgres)**: primary database
- **Memorystore (Redis)**: caching / rate limiting (needs VPC connector if you keep it private; current setup uses public egress)
- **Cloud Storage**: user uploads and frontend assets (signed URLs)
- **Pub/Sub + Cloud Scheduler**: periodic/background triggers
- **Artifact Registry**: container images
- **Secret Manager**: secrets (recommended; wire via Cloud Run envs)
- **Vertex AI**: enabled; backend SA has `aiplatform.user` (you can swap OpenAI for Vertex endpoints)

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

## Per-Resource Knobs
- Cloud SQL: `tier`, `high_availability`, `deletion_protection`, user/password in env root `main.tf`.
- Redis: `tier` (BASIC/STD_HA), `memory_size_gb`. Without a VPC connector, use a public Redis endpoint instead of Memorystore.
- Cloud Run: CORS origins, images, env vars; `vpc_connector` currently `null`. Add min/max instances or secret envs if desired.
- Storage: bucket names (`app-frontend-dev/prod`), `force_destroy` flag.
- Scheduler: cron (`schedule`), payload JSON, time zone.
- Artifact Registry: repo id/region if you change from `app` / `us-central1`.
- State: backend bucket names in `infra/terraform/envs/*/main.tf`.

## Infra Breakdown
- Cloud Run (backend & frontend, v2): serves API and React app; envs include DB URL, Redis host/port, GCS bucket, CORS, Vertex project/region.
- Cloud SQL (Postgres): main DB (public IP by default).
- Redis (Memorystore): cache/rate limit; requires private access if kept—otherwise replace with public Redis.
- Cloud Storage: uploads/assets; backend issues signed URLs.
- Pub/Sub + Cloud Scheduler: cron publishes to topic; push subscription hits `/pubsub/push`.
- Artifact Registry: container images.
- Secret Manager: store sensitive values (access role granted to backend SA).
- Vertex AI: API enabled; backend SA has `roles/aiplatform.user` (ready for Vertex model calls).

## Updating Docs
- When architecture/services/workflows change, update this README and `AGENTS.md`.

## License
This project is licensed under the terms of the MIT license. See [LICENSE](LICENSE) for details.
