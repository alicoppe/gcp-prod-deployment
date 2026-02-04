output "backend_url" {
  value = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  value = google_cloud_run_v2_service.frontend.uri
}

output "backend_service_name" {
  value = google_cloud_run_v2_service.backend.name
}

output "frontend_service_name" {
  value = google_cloud_run_v2_service.frontend.name
}

output "backend_service_account" {
  value = google_service_account.backend.email
}
