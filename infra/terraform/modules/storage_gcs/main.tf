resource "google_project_service" "storage_api" {
  project = var.project_id
  service = "storage.googleapis.com"
}

resource "google_storage_bucket" "bucket" {
  count                       = var.create_bucket ? 1 : 0
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

data "google_storage_bucket" "existing" {
  count  = var.create_bucket ? 0 : 1
  name   = var.bucket_name
  project = var.project_id
}
