output "backend_url" {
  value = module.cloud_run.backend_url
}

output "frontend_url" {
  value = module.cloud_run.frontend_url
}

output "load_balancer_ip" {
  value       = var.enable_load_balancer ? module.cloud_run_load_balancer[0].lb_ip_address : null
  description = "Global IP for the optional HTTPS load balancer."
}
