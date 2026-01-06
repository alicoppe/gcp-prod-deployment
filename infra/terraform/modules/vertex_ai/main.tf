resource "google_project_service" "vertex_api" {
  project = var.project_id
  service = "aiplatform.googleapis.com"
}

resource "google_project_iam_member" "backend_vertex_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${var.backend_service_account}"
  depends_on = [google_project_service.vertex_api]
}
