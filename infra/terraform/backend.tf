terraform {
  backend "gcs" {
    bucket = var.tf_state_bucket
    prefix = "fastapi-alembic-sqlmodel-async/state"
  }
}
