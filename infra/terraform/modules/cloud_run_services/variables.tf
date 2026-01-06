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
