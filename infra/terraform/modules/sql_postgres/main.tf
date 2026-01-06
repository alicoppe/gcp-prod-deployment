resource "google_project_service" "sql_api" {
  project = var.project_id
  service = "sqladmin.googleapis.com"
}

resource "google_sql_database_instance" "db" {
  name             = var.instance_name
  database_version = "POSTGRES_15"
  project          = var.project_id
  region           = var.region

  settings {
    tier = var.tier
    ip_configuration {
      ipv4_enabled = true
    }
    backup_configuration {
      enabled = true
    }
    availability_type = var.high_availability ? "REGIONAL" : "ZONAL"
  }

  deletion_protection = var.deletion_protection
  depends_on          = [google_project_service.sql_api]
}

resource "google_sql_user" "db_user" {
  instance = google_sql_database_instance.db.name
  name     = var.db_user
  password = var.db_password
  project  = var.project_id
}

resource "google_sql_database" "app" {
  name     = var.db_name
  instance = google_sql_database_instance.db.name
  project  = var.project_id
}
