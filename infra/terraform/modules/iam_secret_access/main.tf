resource "google_project_service" "secret_api" {
  project = var.project_id
  service = "secretmanager.googleapis.com"
}

resource "google_project_iam_member" "backend_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${var.backend_sa_email}"
  depends_on = [google_project_service.secret_api]
}
