variable "project_id" { type = string }
variable "location"   { type = string }
variable "bucket_name" { type = string }
variable "force_destroy" {
  type    = bool
  default = true
}
variable "labels" {
  type    = map(string)
  default = {}
}
