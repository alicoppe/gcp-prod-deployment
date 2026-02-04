output "lb_ip_address" {
  value = google_compute_global_address.lb_ip.address
}

output "lb_domain" {
  value = var.domain
}
