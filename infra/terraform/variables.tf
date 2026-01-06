variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "Primary region (e.g. us-central1)"
  default     = "us-central1"
}

variable "tf_state_bucket" {
  type        = string
  description = "GCS bucket name for Terraform state"
}

variable "artifact_repo" {
  type        = string
  description = "Artifact Registry repo name (without region)"
  default     = "fastapi-template"
}

variable "api_image" {
  type        = string
  description = "Full container image for backend (e.g. us-central1-docker.pkg.dev/PROJECT/REPO/backend:tag)"
}

variable "frontend_image" {
  type        = string
  description = "Full container image for frontend (e.g. us-central1-docker.pkg.dev/PROJECT/REPO/frontend:tag)"
}

variable "db_tier" {
  type        = string
  description = "Cloud SQL machine tier"
  default     = "db-custom-2-7680"
}

variable "db_username" {
  type        = string
  default     = "appuser"
}

variable "db_password" {
  type        = string
  description = "Cloud SQL user password"
  sensitive   = true
}

variable "redis_tier" {
  type        = string
  description = "Memorystore tier: BASIC or STANDARD_HA"
  default     = "BASIC"
}

variable "redis_size_gb" {
  type        = number
  default     = 1
}

variable "frontend_bucket" {
  type        = string
  description = "GCS bucket for frontend static assets / pictures"
}

variable "scheduler_cron" {
  type        = string
  description = "CRON expression for Cloud Scheduler -> Pub/Sub"
  default     = "0 * * * *"
}

variable "allowed_origins" {
  type        = list(string)
  description = "CORS allowed origins for Cloud Run backend"
  default     = ["https://your-domain.com"]
}
