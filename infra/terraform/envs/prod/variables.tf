variable "project_id" { type = string }
variable "region"     { type = string }
variable "vertex_region" { type = string }
variable "backend_image" { type = string }
variable "frontend_image" { type = string }
variable "allowed_origins" {
  type    = list(string)
  default = ["https://your-domain.com"]
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
