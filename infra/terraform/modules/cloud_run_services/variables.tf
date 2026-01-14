variable "project_id" { type = string }
variable "region"     { type = string }
variable "backend_image" { type = string }
variable "frontend_image" { type = string }
variable "db_connection_string" { type = string }
variable "redis_host" { type = string }
variable "redis_port" { type = string }
variable "bucket_name" { type = string }
variable "vertex_project_id" { type = string }
variable "vertex_region" { type = string }
variable "cors_origins" {
  type    = list(string)
  default = []
}
variable "vpc_connector" {
  type    = string
  default = null
}
variable "labels" {
  type    = map(string)
  default = {}
}

variable "backend_cpu" {
  type    = string
  default = "1"
}
variable "backend_memory" {
  type    = string
  default = "512Mi"
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
