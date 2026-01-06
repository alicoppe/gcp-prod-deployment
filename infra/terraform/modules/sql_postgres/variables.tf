variable "project_id" { type = string }
variable "region"     { type = string }
variable "instance_name" { type = string }
variable "db_name"    { type = string }
variable "db_user"    { type = string }
variable "db_password" {
  type      = string
  sensitive = true
}
variable "tier" {
  type    = string
  default = "db-f1-micro"
}
variable "high_availability" {
  type    = bool
  default = false
}
variable "deletion_protection" {
  type    = bool
  default = false
}
variable "labels" {
  type    = map(string)
  default = {}
}
