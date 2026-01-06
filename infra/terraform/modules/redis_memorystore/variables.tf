variable "project_id" { type = string }
variable "region"     { type = string }
variable "name"       { type = string }
variable "memory_size_gb" {
  type    = number
  default = 1
}
variable "tier" {
  type    = string
  default = "BASIC"
}
variable "labels" {
  type    = map(string)
  default = {}
}
