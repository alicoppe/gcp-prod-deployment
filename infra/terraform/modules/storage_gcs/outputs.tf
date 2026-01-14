locals {
  resolved_bucket_name = var.create_bucket ? google_storage_bucket.bucket[0].name : data.google_storage_bucket.existing[0].name
}

output "bucket_name" {
  value = local.resolved_bucket_name
}

output "url_prefix" {
  value = "gs://${local.resolved_bucket_name}"
}
