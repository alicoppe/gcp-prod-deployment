locals {
  artifact_repo_id = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_repo}"
}

# Artifact Registry for images (repo must exist before pushing)
resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = var.artifact_repo
  format        = "DOCKER"
}

# Service accounts
resource "google_service_account" "run_api" {
  account_id   = "fastapi-api-sa"
  display_name = "FastAPI Cloud Run SA"
}

resource "google_service_account" "run_frontend" {
  account_id   = "fastapi-frontend-sa"
  display_name = "Frontend Cloud Run SA"
}

# Cloud SQL Postgres
resource "google_sql_database_instance" "db" {
  name             = "fastapi-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = var.db_tier
    ip_configuration {
      ipv4_enabled = true
      # For private IP, add private_network here.
    }
    backup_configuration {
      enabled = true
    }
  }
}

resource "google_sql_user" "db_user" {
  instance = google_sql_database_instance.db.name
  name     = var.db_username
  password = var.db_password
}

resource "google_sql_database" "app" {
  name     = "app"
  instance = google_sql_database_instance.db.name
}

# Memorystore Redis
resource "google_redis_instance" "redis" {
  name           = "fastapi-redis"
  tier           = var.redis_tier
  memory_size_gb = var.redis_size_gb
  region         = var.region
}

# Storage bucket for frontend pictures / assets
resource "google_storage_bucket" "frontend_bucket" {
  name                        = var.frontend_bucket
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = true
  versioning {
    enabled = false
  }
}

# Pub/Sub for scheduled triggers
resource "google_pubsub_topic" "scheduled" {
  name = "scheduled-tasks"
}

# Push subscription to call the backend Pub/Sub handler
resource "google_pubsub_subscription" "scheduled_push" {
  name  = "scheduled-push"
  topic = google_pubsub_topic.scheduled.name

  push_config {
    push_endpoint = "${google_cloud_run_service.api.status[0].url}/pubsub/push"
    oidc_token {
      service_account_email = google_service_account.run_api.email
    }
  }
}

# Cloud Scheduler -> Pub/Sub
resource "google_cloud_scheduler_job" "hourly_job" {
  name        = "fastapi-scheduled-job"
  description = "Publishes to Pub/Sub to trigger backend work"
  schedule    = var.scheduler_cron
  time_zone   = "Etc/UTC"

  pubsub_target {
    topic_name = google_pubsub_topic.scheduled.id
    data       = base64encode("{\"event\":\"scheduled\"}")
  }
}

# Cloud Run - Backend
resource "google_cloud_run_service" "api" {
  name     = "fastapi-backend"
  location = var.region

  template {
    spec {
      service_account_name = google_service_account.run_api.email
      containers {
        image = var.api_image
        env {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${var.db_password}@${google_sql_database_instance.db.public_ip_address}:5432/${google_sql_database.app.name}"
        }
        env {
          name  = "REDIS_HOST"
          value = google_redis_instance.redis.host
        }
        env {
          name  = "REDIS_PORT"
          value = tostring(google_redis_instance.redis.port)
        }
        env {
          name  = "STORAGE_BACKEND"
          value = "gcs"
        }
        env {
          name  = "GCS_BUCKET"
          value = google_storage_bucket.frontend_bucket.name
        }
        env {
          name  = "GCS_SIGNED_URL_EXPIRE_MINUTES"
          value = "10080"
        }
        env {
          name  = "FRONTEND_BUCKET"
          value = google_storage_bucket.frontend_bucket.name
        }
        env {
          name  = "BACKEND_CORS_ORIGINS"
          value = join(",", var.allowed_origins)
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Cloud Run - Frontend
resource "google_cloud_run_service" "frontend" {
  name     = "fastapi-frontend"
  location = var.region

  template {
    spec {
      service_account_name = google_service_account.run_frontend.email
      containers {
        image = var.frontend_image
        env {
          name  = "VITE_API_URL"
          value = google_cloud_run_service.api.status[0].url
        }
        env {
          name  = "VITE_ASSET_BUCKET"
          value = google_storage_bucket.frontend_bucket.name
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Allow public access
resource "google_cloud_run_service_iam_member" "api_invoker" {
  service  = google_cloud_run_service.api.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "frontend_invoker" {
  service  = google_cloud_run_service.frontend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
