resource "google_project_service" "compute_api" {
  project            = var.project_id
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_compute_global_address" "lb_ip" {
  name    = "${var.name_prefix}-lb-ip"
  project = var.project_id
  depends_on = [google_project_service.compute_api]
}

resource "google_compute_managed_ssl_certificate" "lb_cert" {
  name    = "${var.name_prefix}-lb-cert"
  project = var.project_id
  managed {
    domains = [var.domain]
  }
  depends_on = [google_project_service.compute_api]
}

resource "google_compute_region_network_endpoint_group" "frontend_neg" {
  name                  = "${var.name_prefix}-frontend-neg"
  project               = var.project_id
  region                = var.region
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = var.frontend_service_name
  }
  depends_on = [google_project_service.compute_api]
}

resource "google_compute_region_network_endpoint_group" "backend_neg" {
  name                  = "${var.name_prefix}-backend-neg"
  project               = var.project_id
  region                = var.region
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = var.backend_service_name
  }
  depends_on = [google_project_service.compute_api]
}

resource "google_compute_backend_service" "frontend" {
  name                  = "${var.name_prefix}-frontend-backend"
  project               = var.project_id
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL"
  timeout_sec           = 30
  backend {
    group = google_compute_region_network_endpoint_group.frontend_neg.id
  }
  depends_on = [google_project_service.compute_api]
}

resource "google_compute_backend_service" "backend" {
  name                  = "${var.name_prefix}-backend-backend"
  project               = var.project_id
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL"
  timeout_sec           = 30
  backend {
    group = google_compute_region_network_endpoint_group.backend_neg.id
  }
  depends_on = [google_project_service.compute_api]
}

resource "google_compute_url_map" "https_map" {
  name    = "${var.name_prefix}-url-map"
  project = var.project_id

  default_service = google_compute_backend_service.frontend.id

  host_rule {
    hosts        = [var.domain]
    path_matcher = "allpaths"
  }

  path_matcher {
    name            = "allpaths"
    default_service = google_compute_backend_service.frontend.id

    path_rule {
      paths   = [var.api_path]
      service = google_compute_backend_service.backend.id
    }
  }
  depends_on = [google_project_service.compute_api]
}

resource "google_compute_target_https_proxy" "https_proxy" {
  name             = "${var.name_prefix}-https-proxy"
  project          = var.project_id
  url_map          = google_compute_url_map.https_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.lb_cert.id]
  depends_on       = [google_project_service.compute_api]
}

resource "google_compute_global_forwarding_rule" "https_forwarding_rule" {
  name                  = "${var.name_prefix}-https-forwarding"
  project               = var.project_id
  ip_address            = google_compute_global_address.lb_ip.address
  port_range            = "443"
  target                = google_compute_target_https_proxy.https_proxy.id
  load_balancing_scheme = "EXTERNAL"
  depends_on            = [google_project_service.compute_api]
}

resource "google_compute_url_map" "http_redirect" {
  count   = var.enable_http_redirect ? 1 : 0
  name    = "${var.name_prefix}-http-redirect"
  project = var.project_id

  default_url_redirect {
    https_redirect = true
    strip_query    = false
  }
  depends_on = [google_project_service.compute_api]
}

resource "google_compute_target_http_proxy" "http_proxy" {
  count   = var.enable_http_redirect ? 1 : 0
  name    = "${var.name_prefix}-http-proxy"
  project = var.project_id
  url_map = google_compute_url_map.http_redirect[0].id
  depends_on = [google_project_service.compute_api]
}

resource "google_compute_global_forwarding_rule" "http_forwarding_rule" {
  count                = var.enable_http_redirect ? 1 : 0
  name                 = "${var.name_prefix}-http-forwarding"
  project              = var.project_id
  ip_address           = google_compute_global_address.lb_ip.address
  port_range           = "80"
  target               = google_compute_target_http_proxy.http_proxy[0].id
  load_balancing_scheme = "EXTERNAL"
  depends_on           = [google_project_service.compute_api]
}
