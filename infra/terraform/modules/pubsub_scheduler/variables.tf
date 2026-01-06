variable "project_id" { type = string }
variable "region"     { type = string }
variable "topic_name" {
  type    = string
  default = "scheduled-tasks"
}
variable "subscription_name" {
  type    = string
  default = "scheduled-push"
}
variable "job_name" {
  type    = string
  default = "fastapi-scheduled-job"
}
variable "schedule" {
  type    = string
  default = "0 * * * *"
}
variable "time_zone" {
  type    = string
  default = "Etc/UTC"
}
variable "payload_json" {
  type    = string
  default = "{\"event\":\"scheduled\"}"
}
variable "push_endpoint" { type = string }
variable "push_service_account" { type = string }
variable "labels" {
  type    = map(string)
  default = {}
}
