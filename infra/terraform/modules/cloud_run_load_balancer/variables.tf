variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name_prefix" {
  type    = string
  default = "fastapi"
}

variable "domain" {
  type = string
}

variable "frontend_service_name" {
  type = string
}

variable "backend_service_name" {
  type = string
}

variable "api_path" {
  type    = string
  default = "/api/*"
}

variable "enable_http_redirect" {
  type    = bool
  default = true
}
