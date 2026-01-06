output "connection_name" {
  value = google_sql_database_instance.db.connection_name
}

output "public_ip" {
  value = google_sql_database_instance.db.public_ip_address
}

output "uri" {
  value = "postgresql://${var.db_user}:${var.db_password}@${google_sql_database_instance.db.public_ip_address}:5432/${var.db_name}"
  sensitive = true
}

output "db_name" {
  value = var.db_name
}

output "db_user" {
  value = var.db_user
}
