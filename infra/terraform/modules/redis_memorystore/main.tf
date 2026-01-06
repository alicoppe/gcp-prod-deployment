resource "google_project_service" "redis_api" {
  project = var.project_id
  service = "redis.googleapis.com"
}

resource "google_redis_instance" "redis" {
  name           = var.name
  project        = var.project_id
  region         = var.region
  tier           = var.tier
  memory_size_gb = var.memory_size_gb
  labels         = var.labels

  depends_on = [google_project_service.redis_api]
}
