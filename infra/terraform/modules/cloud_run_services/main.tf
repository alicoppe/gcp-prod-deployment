resource "google_project_service" "run_api" {
  project = var.project_id
  service = "run.googleapis.com"
}

resource "google_project_service" "iam_api" {
  project = var.project_id
  service = "iam.googleapis.com"
}

resource "google_service_account" "backend" {
  account_id   = "fastapi-api-sa"
  display_name = "FastAPI Cloud Run SA"
  project      = var.project_id
  depends_on   = [google_project_service.iam_api]
}

resource "google_service_account" "frontend" {
  account_id   = "fastapi-frontend-sa"
  display_name = "Frontend Cloud Run SA"
  project      = var.project_id
  depends_on   = [google_project_service.iam_api]
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "fastapi-backend"
  location = var.region
  project  = var.project_id
  deletion_protection = var.cloud_run_deletion_protection

  template {
    service_account = google_service_account.backend.email
    containers {
      image = var.backend_image
      resources {
        limits = {
          cpu    = var.backend_cpu
          memory = var.backend_memory
        }
        cpu_idle = true
      }
      env {
        name  = "DATABASE_URL"
        value = var.db_connection_string
      }
      env {
        name  = "DATABASE_USER"
        value = var.db_user
      }
      dynamic "env" {
        for_each = var.db_password_secret_name == null || var.db_password_secret_name == "" ? [] : [var.db_password_secret_name]
        content {
          name = "DATABASE_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
      env {
        name  = "DATABASE_HOST"
        value = var.db_host
      }
      env {
        name  = "DATABASE_PORT"
        value = tostring(var.db_port)
      }
      env {
        name  = "DATABASE_NAME"
        value = var.db_name
      }
      env {
        name  = "REDIS_HOST"
        value = var.redis_host
      }
      env {
        name  = "REDIS_PORT"
        value = var.redis_port
      }
      env {
        name  = "STORAGE_BACKEND"
        value = "gcs"
      }
      env {
        name  = "GCS_BUCKET"
        value = var.bucket_name
      }
      env {
        name  = "GCS_SIGNED_URL_EXPIRE_MINUTES"
        value = "10080"
      }
      env {
        name  = "BACKEND_CORS_ORIGINS"
        value = join(",", var.cors_origins)
      }
      dynamic "env" {
        for_each = var.encrypt_key_secret_name == null || var.encrypt_key_secret_name == "" ? [] : [var.encrypt_key_secret_name]
        content {
          name = "ENCRYPT_KEY"
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
      env {
        name  = "VERTEX_PROJECT_ID"
        value = var.vertex_project_id
      }
      env {
        name  = "VERTEX_REGION"
        value = var.vertex_region
      }
      env {
        name  = "WEB_CONCURRENCY"
        value = tostring(var.web_concurrency)
      }
      env {
        name  = "PROJECT_NAME"
        value = var.project_name
      }
    }
    dynamic "vpc_access" {
      for_each = var.vpc_connector == null ? [] : [var.vpc_connector]
      content {
        connector = vpc_access.value
        egress    = "ALL_TRAFFIC"
      }
    }
    labels = var.labels
  }

  scaling {
    min_instance_count = var.backend_min_instances
    max_instance_count = var.backend_max_instances
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [google_project_service.run_api]
}

resource "google_cloud_run_v2_service" "frontend" {
  name     = "fastapi-frontend"
  location = var.region
  project  = var.project_id
  deletion_protection = var.cloud_run_deletion_protection

  template {
    service_account = google_service_account.frontend.email
    containers {
      image = var.frontend_image
      resources {
        limits = {
          cpu    = var.frontend_cpu
          memory = var.frontend_memory
        }
        cpu_idle = true
      }
      env {
        name  = "VITE_API_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
      env {
        name  = "VITE_ASSET_BUCKET"
        value = var.bucket_name
      }
    }
    labels = var.labels
  }

  scaling {
    min_instance_count = var.frontend_min_instances
    max_instance_count = var.frontend_max_instances
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [google_project_service.run_api, google_cloud_run_v2_service.backend]
}

resource "google_cloud_run_v2_service_iam_member" "backend_invoker" {
  name     = google_cloud_run_v2_service.backend.name
  project  = var.project_id
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "frontend_invoker" {
  name     = google_cloud_run_v2_service.frontend.name
  project  = var.project_id
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
