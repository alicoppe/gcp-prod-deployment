output "bucket_name" {
  value = google_storage_bucket.bucket.name
}

output "url_prefix" {
  value = "gs://${google_storage_bucket.bucket.name}"
}
