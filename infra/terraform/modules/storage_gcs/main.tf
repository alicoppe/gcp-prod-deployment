resource "google_project_service" "storage_api" {
  project = var.project_id
  service = "storage.googleapis.com"
}

resource "google_storage_bucket" "bucket" {
  name                        = var.bucket_name
  project                     = var.project_id
  location                    = var.location
  uniform_bucket_level_access = true
  force_destroy               = var.force_destroy
  labels                      = var.labels

  versioning {
    enabled = false
  }

  depends_on = [google_project_service.storage_api]
}
