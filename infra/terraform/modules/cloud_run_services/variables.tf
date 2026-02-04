variable "project_id" { type = string }
variable "region"     { type = string }
variable "backend_image" { type = string }
variable "frontend_image" { type = string }
variable "db_connection_string" { type = string }
variable "db_user" { type = string }
variable "db_name" { type = string }
variable "db_host" { type = string }
variable "db_port" { type = number }
variable "db_password_secret_name" {
  type    = string
  default = "db-password"
}
variable "redis_host" { type = string }
variable "redis_port" { type = string }
variable "bucket_name" { type = string }
variable "vertex_project_id" { type = string }
variable "vertex_region" { type = string }
variable "project_name" { type = string }
variable "cors_origins" {
  type    = list(string)
  default = []
}
variable "cors_origin_regex" {
  type    = string
  default = ""
}
variable "backend_url_override" {
  type    = string
  default = ""
}
variable "vpc_connector" {
  type    = string
  default = null
}
variable "labels" {
  type    = map(string)
  default = {}
}

variable "encrypt_key_secret_name" {
  type    = string
  default = "encrypt-key"
}

variable "backend_cpu" {
  type    = string
  default = "1"
}
variable "backend_memory" {
  type    = string
  default = "512Mi"
}
variable "web_concurrency" {
  type    = number
  default = 1
}
variable "backend_min_instances" {
  type    = number
  default = 0
}
variable "backend_max_instances" {
  type    = number
  default = 1
}

variable "frontend_cpu" {
  type    = string
  default = "1"
}
variable "frontend_memory" {
  type    = string
  default = "512Mi"
}
variable "frontend_min_instances" {
  type    = number
  default = 0
}
variable "frontend_max_instances" {
  type    = number
  default = 1
}

variable "cloud_run_deletion_protection" {
  type    = bool
  default = true
}
