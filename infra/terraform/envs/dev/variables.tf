variable "project_id" { type = string }
variable "region"     { type = string }
variable "vertex_region" { type = string }
variable "backend_image" { type = string }
variable "frontend_image" { type = string }
variable "project_name" {
  type    = string
  default = "fastapi-sqlmodel-alembic"
}
variable "allowed_origins" {
  type    = list(string)
  default = ["http://fastapi.localhost", "http://app.localhost"]
}

variable "encrypt_key_secret_name" {
  type    = string
  default = "encrypt-key"
}

variable "backend_url_override" {
  type    = string
  default = ""
}

variable "vertex_ai_quota_overrides" {
  type = list(object({
    service        = string
    metric         = string
    limit          = string
    override_value = string
    dimensions     = map(string)
  }))
  default = []
}
