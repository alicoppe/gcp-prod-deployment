resource "google_project_service" "artifact_api" {
  project = var.project_id
  service = "artifactregistry.googleapis.com"
}

resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = var.repo_id
  format        = "DOCKER"
  labels        = var.labels
  depends_on    = [google_project_service.artifact_api]
}
