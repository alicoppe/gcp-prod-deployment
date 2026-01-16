# Full‑Stack FastAPI + React Scaffolding (GCP‑ready)

This repo is a **full-stack starter** pairing a FastAPI backend (async SQLModel + Alembic) with a React + Tailwind frontend. It ships with Docker Compose for local dev/test, Terraform for Google Cloud production, and GitHub Actions for automated plan/apply.

## Why Use This Template?
- **Backend**: FastAPI (async), SQLModel, Alembic, JWT auth, Redis-backed cache/rate limits.
- **Frontend**: React + Vite + Tailwind placeholder wired to the API via Caddy locally and Cloud Run in prod.
- **Storage**: Local filesystem in dev; Google Cloud Storage with signed URLs in prod.
- **Background / Scheduling**: Cloud Scheduler → Pub/Sub → backend push handler.
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
- Python 3.11+ if running backend directly
- uv (for backend dependency management)
- Node 20+ if running frontend directly

## Local Development
Run the stack (dev):
```sh
docker compose -f docker-compose-dev.yml up --build
```
Local CI checks with `act` (skips Terraform plan):
```sh
make ci-local
```
Quick workflows (Makefile):
```sh
# Full dev stack
make run-dev            # first time or after Dockerfile/dep changes: make run-dev-build

# Backend-only (API + DB + Redis + Caddy)
make run-backend        # first time or after Dockerfile/dep changes: make run-backend-build

# Frontend-only
make run-frontend        # first time or after Dockerfile/dep changes: make run-frontend-build

# Tests (stack + pytest)
make run-test
make pytest

# pgAdmin (optional DB UI)
make run-pgadmin
```
Services (dev):
- FastAPI: http://fastapi.localhost/docs
- Frontend: http://app.localhost
- Static files: http://static.localhost
- Postgres: mapped to localhost:5454

.env tips for local:
- You can keep most defaults as-is for local dev.
- `DATABASE_HOST` must stay `database` and `REDIS_HOST` must stay `redis_server` when using Docker Compose.
- It’s best to change `SECRET_KEY`, `ENCRYPT_KEY`, and the admin credentials even for local work.
- `ENCRYPT_KEY` must be a valid Fernet key (generate via `python - <<'PY'\nfrom cryptography.fernet import Fernet\nprint(Fernet.generate_key().decode())\nPY`).
- Only set `OPENAI_API_KEY`, `VERTEX_*`, or `GCS_*` if you plan to use those services locally.

Hot reload:
- Backend: Uvicorn `--reload`
- Frontend: Vite dev server

Testing “periodic” work locally:
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

3) Enable required APIs (one-time per project):
```sh
gcloud services enable cloudresourcemanager.googleapis.com \
  --project <PROJECT_ID>
gcloud services enable sqladmin.googleapis.com \
  --project <PROJECT_ID>
gcloud services enable iam.googleapis.com \
  --project <PROJECT_ID>
```

4) Create the app asset buckets (pre-created, referenced by Terraform):
```sh
# Dev bucket
gcloud storage buckets create gs://app-frontend-dev --location=us-central1 --uniform-bucket-level-access

# Prod bucket
gcloud storage buckets create gs://app-frontend-prod --location=us-central1 --uniform-bucket-level-access
```
These buckets are **referenced** by Terraform (not created) because `create_bucket = false` is set in `infra/terraform/envs/*/main.tf`.

5) Fill per-env tfvars (git-ignored):
- `infra/terraform/envs/dev/terraform.tfvars`
- `infra/terraform/envs/prod/terraform.tfvars`

Set:
- `project_id` (dev: dev-deployment-483516, prod: prod-deployment-483516)
- `region` / `vertex_region` (default `us-central1`)
- `backend_image` / `frontend_image` (Artifact Registry URLs)
- Optional: `allowed_origins`

6) Lock down the Terraform state buckets (example commands with your project IDs)
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
Notes: bucket names must remain globally unique; serialize plans/applies to avoid state-lock contention.

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

gcloud secrets create encrypt-key --replication-policy=automatic
echo -n "your-fernet-key" | gcloud secrets versions add encrypt-key --data-file=-
```
Important: the secret **must** have at least one version. If you created the secret without adding a version, Terraform will fail with “secret not found or has no versions.”
Do likewise for `secret-key`, `openai-key`, etc. Keep values out of git and TF state. Best practice: mount secrets into Cloud Run via secret env vars (module can be extended) or set runtime envs manually after deploy. The backend now reads `ENCRYPT_KEY` from Secret Manager via the `encrypt-key` secret (override with `encrypt_key_secret_name` in Terraform). Note: the DB password is read from Secret Manager by Terraform (`data "google_secret_manager_secret_version"`), so it does not need to live in tfvars.

Grant the Terraform service account access to `db-password` in both dev and prod projects:
```sh
gcloud secrets add-iam-policy-binding db-password \
  --project <PROJECT_ID> \
  --member="serviceAccount:<TERRAFORM_SA_EMAIL>" \
  --role="roles/secretmanager.secretAccessor"
```

## Terraform Layout & Apply
Structure:
- `infra/terraform/globals`: providers/versions
- `infra/terraform/modules`: reusable modules (artifact_registry, sql_postgres, redis_memorystore, storage_gcs, pubsub_scheduler, cloud_run_services, vertex_ai, iam_secret_access)
- `infra/terraform/envs/dev` and `envs/prod`: per-env roots and state

Fill in (per env `terraform.tfvars`, not committed):
- `project_id`, `region`, `vertex_region`
- `backend_image`, `frontend_image` (Artifact Registry URLs)
- `allowed_origins` if overriding defaults
- Optional: `vertex_ai_quota_overrides` (see Cost Controls section)
Note: `deploy-dev.yml` uses build outputs when available; if backend/frontend builds are skipped, it falls back to the `backend_image`/`frontend_image` values in `terraform.tfvars`.

Run:
```sh
cd infra/terraform/envs/dev
terraform init           # update backend bucket name first
terraform plan -var-file=terraform.tfvars
terraform apply
```
Repeat for prod.

## Initial Cloud SQL Bootstrap (Local, No JSON Keys)
If you want the **Cloud SQL instance created before GitHub Actions runs**, you can apply only the SQL module locally using **service account impersonation**. This keeps state in the same Terraform bucket and avoids storing a JSON key.

Why do it this way:
- No long-lived JSON keys.
- The SQL instance is written into **Terraform state** (same GCS backend), so CI won’t recreate it.
- Lets you validate Terraform locally before handing off to GitHub Actions.

### Prereqs
- Your user can impersonate the Terraform service account:
  ```sh
  gcloud iam service-accounts add-iam-policy-binding <TERRAFORM_SA_EMAIL> \
    --member="user:<YOUR_EMAIL>" \
    --role="roles/iam.serviceAccountTokenCreator" \
    --project <PROJECT_ID>
  ```
- IAM Credentials API enabled:
  ```sh
  gcloud services enable iamcredentials.googleapis.com --project <PROJECT_ID>
  ```

### Dev example
```sh
PROJECT_ID=dev-deployment-483516
TERRAFORM_SA=terraform-dev@dev-deployment-483516.iam.gserviceaccount.com

gcloud auth login
gcloud auth application-default login
gcloud auth application-default set-quota-project $PROJECT_ID
export GOOGLE_IMPERSONATE_SERVICE_ACCOUNT=$TERRAFORM_SA

cd infra/terraform/envs/dev
terraform init -reconfigure
terraform apply -var-file=terraform.tfvars -target=module.sql -target=module.artifact_registry
```

### Prod example
```sh
PROJECT_ID=prod-deployment-483516
TERRAFORM_SA=terraform-prod@prod-deployment-483516.iam.gserviceaccount.com

gcloud auth login
gcloud auth application-default login
gcloud auth application-default set-quota-project $PROJECT_ID
export GOOGLE_IMPERSONATE_SERVICE_ACCOUNT=$TERRAFORM_SA

cd infra/terraform/envs/prod
terraform init -reconfigure
terraform apply -var-file=terraform.tfvars -target=module.sql -target=module.artifact_registry
```

### After SQL is created
Add these GitHub Variables so workflows can run migrations via Cloud SQL Proxy:
- `DEV_SQL_INSTANCE_CONNECTION`
- `PROD_SQL_INSTANCE_CONNECTION`
- `DEV_DB_USER`
- `DEV_DB_NAME`
- `PROD_DB_USER`
- `PROD_DB_NAME`

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
- No worker service in prod; local dev hits the same endpoint manually.

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
- GitHub Actions workflows:
  - `ci.yml`: PR validation (backend tests, migrations check, frontend build; Terraform plan runs after these succeed)
  - `deploy-dev.yml`: auto deploy on `main` (build images, Terraform apply, migrations, smoke test)
  - `deploy-prod.yml`: manual prod deploy with GitHub Environment approvals

### Local CI with act
To test `ci.yml` locally before opening a PR:
```sh
make ci-local
```
Notes:
- Terraform plan is skipped locally by design (no service account access).
- `make ci-local` auto-detects your current git branch and default branch to generate the event payload.
- `make ci-local` runs with `--container-architecture linux/amd64` for Apple Silicon compatibility.
- `make ci-local` runs the CI jobs sequentially to avoid local toolcache races.
- Provide secrets to act if needed (e.g., `ENCRYPT_KEY_TEST`) via a secret file:
  1) Copy `.github/act/secrets.example` to `.github/act/secrets`
  2) Fill in values
- CI services use `localhost` on GitHub runners and for `act` by default. Ports are mapped to 15432/16379 to avoid local conflicts.
- To override local ports for `act`, copy `.github/act/env.example` to `.github/act/env` and edit the `ACT_DB_*` / `ACT_REDIS_*` values.

### Workload Identity Federation (DEV/PROD)
Use Workload Identity Federation (WIF) so GitHub Actions can authenticate to GCP without long-lived service account keys. The following example shows how to create the **dev** pool and provider and output the resource name for the GitHub secret. Repeat for **prod** with a different pool name (e.g. `github-actions-prod`) and prod project/service account.

```bash
PROJECT_ID=
SERVICE_ACCOUNT=
GITHUB_REPO=

gcloud config set project "$PROJECT_ID"

# Get project number
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" \
  --format="value(projectNumber)")

# 1) Create Workload Identity Pool (idempotent; will error if it already exists)
gcloud iam workload-identity-pools create "github-actions-dev" \
  --location="global" \
  --display-name="GitHub Actions Dev"

# 2) Create OIDC provider for GitHub with attribute mapping + condition
gcloud iam workload-identity-pools providers create-oidc "github" \
  --workload-identity-pool="github-actions-dev" \
  --location="global" \
  --display-name="GitHub OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="attribute.repository=='${GITHUB_REPO}'"

# 3) Allow this pool (for this repo) to impersonate the dev Terraform SA
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-dev/attribute.repository/${GITHUB_REPO}"

# 4) Print provider resource name for GitHub secret
echo "GCP_WIF_PROVIDER_DEV=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-dev/providers/github"
```

### Required GitHub Secrets
Set these in Settings -> Secrets and variables -> Actions.

Repository variables (non-secret)
- GCP_REGION (example: us-central1)
- ARTIFACT_REGISTRY (example: us-central1-docker.pkg.dev)
- DEV_PROJECT_ID
- PROD_PROJECT_ID
- VITE_ASSET_BUCKET (asset bucket name baked into the frontend build)
- GCP_WIF_PROVIDER_DEV
- GCP_WIF_PROVIDER_PROD
- GCP_SA_TERRAFORM_DEV
- GCP_SA_TERRAFORM_PROD
- DEV_SQL_INSTANCE_CONNECTION
- PROD_SQL_INSTANCE_CONNECTION
 - DEV_DB_USER
 - DEV_DB_NAME
 - PROD_DB_USER
 - PROD_DB_NAME
If you want different buckets per env, use Environment-level variables or duplicate the build step to pass a different value for prod.

Repository secrets (shared)
- GOOGLE_CHAT_WEBHOOK_DEV
- ENCRYPT_KEY_TEST

Environment secrets (prod)
- GOOGLE_CHAT_WEBHOOK_PROD

Store non-sensitive values above as GitHub Variables, not secrets.
Note: You can split service accounts by role (CI build vs Terraform vs migrations) for least privilege, but this repo now uses the Terraform service account for all steps per environment.
Migrations now fetch the DB password and encrypt key from GCP Secret Manager (`db-password`, `encrypt-key`). Ensure the Terraform service account has `roles/secretmanager.secretAccessor` on those secrets in both dev and prod.
Terraform service accounts also need permissions to enable APIs and update project IAM:
- `roles/serviceusage.serviceUsageAdmin`
- `roles/resourcemanager.projectIamAdmin`
Grant these roles (per project):
```sh
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:<TERRAFORM_SA_EMAIL>" \
  --role="roles/serviceusage.serviceUsageAdmin"

gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:<TERRAFORM_SA_EMAIL>" \
  --role="roles/resourcemanager.projectIamAdmin"
```

### GitHub Environment setup for prod
1) Go to Settings -> Environments -> New environment -> name it `prod`.
2) Enable Required reviewers and add yourself/team.
3) Optional: add a wait timer (for example, 5 minutes before deployment can proceed).
4) Add the environment-specific secrets above.
5) Migrations run under the same `prod` environment approval by default.

Now when you run `deploy-prod.yml`, it will pause at the `terraform-apply-prod` job until you approve in the Actions UI.

### Google Chat notifications (webhooks)
1) Create a webhook in Google Chat
   - Open Google Chat and go to the space where you want notifications.
   - Click the space name -> Apps & integrations.
   - Click Webhooks -> Add webhooks.
   - Name it (for example, "CI/CD Notifications").
   - Click Save and copy the webhook URL.

The URL looks like:
```
https://chat.googleapis.com/v1/spaces/AAAA.../messages?key=...&token=...
```

2) Store webhook URL in GitHub Secrets
```
GOOGLE_CHAT_WEBHOOK_DEV
  Value: https://chat.googleapis.com/v1/spaces/.../messages?key=...&token=...

GOOGLE_CHAT_WEBHOOK_PROD
  Value: (different space URL if you want separate prod/dev spaces)
```

### How to use these workflows
Day-to-day development:
```bash
# Work on feature
git checkout -b feature/my-feature

# Push and open PR to main
git push origin feature/my-feature
# CI runs: backend tests, frontend build, migrations check, TF plan
```

Deploy to dev:
```bash
# Merge PR to main
# deploy-dev.yml automatically runs:
# 1. Builds images
# 2. Applies Terraform
# 3. Runs migrations
# 4. Smoke tests
```

Deploy to prod:
```bash
# Go to Actions -> Deploy to Production -> Run workflow
# Input:
#   backend_image_tag: <commit-sha-from-dev>
#   frontend_image_tag: <same-sha>
# Workflow pauses for approval -> apply -> migrations -> smoke test
```

## Per-Resource Knobs
- Cloud SQL: in `infra/terraform/envs/*/main.tf` → `module "sql"`:
  - `tier` (instance size), `high_availability`, `deletion_protection`.
- Redis: in `infra/terraform/envs/*/main.tf` → `module "redis"`:
  - `tier` (BASIC/STD_HA), `memory_size_gb`.
- Cloud Run: in `infra/terraform/envs/*/main.tf` → `module "cloud_run"`:
  - `backend_cpu`, `backend_memory`, `backend_min_instances`, `backend_max_instances`.
  - `frontend_cpu`, `frontend_memory`, `frontend_min_instances`, `frontend_max_instances`.
  - `cors_origins`, `vpc_connector`.
- Storage: bucket names (`app-frontend-dev/prod`), `force_destroy` flag.
- Scheduler: cron (`schedule`), payload JSON, time zone.
- Artifact Registry: repo id/region if you change from `app` / `us-central1`.
- State: backend bucket names in `infra/terraform/envs/*/main.tf`.

## Cost Controls (Recommended)
You can cap autoscaling costs in Terraform and add quota/budget protections in GCP:

- **Cloud Run scaling caps (Terraform)**: `backend_max_instances` and `frontend_max_instances` are wired in `infra/terraform/envs/*/main.tf`. Cloud Run max instances is a built-in cost control.
- **Cloud Run warm instances**: `*_min_instances` controls how many instances stay warm (default is 0).
- **Vertex AI quotas (Terraform, optional)**: set `vertex_ai_quota_overrides` in your `terraform.tfvars` to apply consumer quota overrides for `aiplatform.googleapis.com`. This repo includes a `google_service_usage_consumer_quota_override` resource in both dev/prod envs. Use the Vertex AI quotas page to identify the exact metric/limit names for your region and feature.
- **Budgets & alerts (GCP)**: budgets send alerts and Pub/Sub notifications but do **not** hard-cap spend. Use them to trigger automation if needed.

Example `terraform.tfvars` override (replace metric/limit with values from the Quotas page):
```hcl
vertex_ai_quota_overrides = [
  {
    service        = "aiplatform.googleapis.com"
    metric         = "aiplatform.googleapis.com/online_prediction_requests"
    limit          = "aiplatform.googleapis.com/online_prediction_requests_per_minute"
    override_value = "60"
    dimensions     = { region = "us-central1" }
  }
]
```

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

Successful merge!
