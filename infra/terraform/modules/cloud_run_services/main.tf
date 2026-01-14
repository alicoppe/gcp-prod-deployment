resource "google_project_service" "run_api" {
  project = var.project_id
  service = "run.googleapis.com"
}

resource "google_service_account" "backend" {
  account_id   = "fastapi-api-sa"
  display_name = "FastAPI Cloud Run SA"
  project      = var.project_id
}

resource "google_service_account" "frontend" {
  account_id   = "fastapi-frontend-sa"
  display_name = "Frontend Cloud Run SA"
  project      = var.project_id
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "fastapi-backend"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.backend.email
    containers {
      image = var.backend_image
      resources {
        limits = {
          cpu    = var.backend_cpu
          memory = var.backend_memory
        }
      }
      env {
        name  = "DATABASE_URL"
        value = var.db_connection_string
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
      env {
        name  = "VERTEX_PROJECT_ID"
        value = var.vertex_project_id
      }
      env {
        name  = "VERTEX_REGION"
        value = var.vertex_region
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

  template {
    service_account = google_service_account.frontend.email
    containers {
      image = var.frontend_image
      resources {
        limits = {
          cpu    = var.frontend_cpu
          memory = var.frontend_memory
        }
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
