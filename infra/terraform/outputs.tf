output "api_url" {
  value = google_cloud_run_service.api.status[0].url
}

output "frontend_url" {
  value = google_cloud_run_service.frontend.status[0].url
}

output "db_instance_connection_name" {
  value = google_sql_database_instance.db.connection_name
}

output "redis_host" {
  value = google_redis_instance.redis.host
}

output "frontend_bucket" {
  value = google_storage_bucket.frontend_bucket.name
}
