output "repository_id" {
  value = google_artifact_registry_repository.app.repository_id
}

output "repository_url" {
  value = "https://${var.region}-docker.pkg.dev/${var.project_id}/${var.repo_id}"
}
