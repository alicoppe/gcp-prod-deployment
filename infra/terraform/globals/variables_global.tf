variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "Default region"
}

variable "labels" {
  type        = map(string)
  description = "Common resource labels"
  default     = {}
}
