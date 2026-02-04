terraform {
  backend "gcs" {
    bucket = "tf-state-dev-deployment-483516"
    prefix = "envs/dev"
  }
}

# ci: trigger deploy-dev

locals {
  labels = {
    env = "dev"
    app = "fastapi-react"
  }
  vpc_connector_full_name = "projects/${var.project_id}/locations/${var.region}/connectors/serverless-connector-dev"
  backend_url_for_pubsub  = var.backend_url_override != "" ? var.backend_url_override : module.cloud_run.backend_url
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

data "google_secret_manager_secret_version" "db_password" {
  project = var.project_id
  secret  = "db-password"
  version = "latest"
}

data "google_compute_network" "default" {
  name = "default"
}

resource "google_project_service" "vpc_access_api" {
  project = var.project_id
  service = "vpcaccess.googleapis.com"
}

resource "google_vpc_access_connector" "serverless" {
  name          = "serverless-connector-dev"
  project       = var.project_id
  region        = var.region
  network       = data.google_compute_network.default.name
  ip_cidr_range = "10.8.0.0/28"
  min_instances = 2
  max_instances = 3

  depends_on = [google_project_service.vpc_access_api]
}

module "artifact_registry" {
  source     = "../../modules/artifact_registry"
  project_id = var.project_id
  region     = var.region
  repo_id    = "app"
  labels     = local.labels
}

module "sql" {
  source             = "../../modules/sql_postgres"
  project_id         = var.project_id
  region             = var.region
  instance_name      = "app-dev"
  db_name            = "app"
  db_user            = "app_user"
  db_password        = data.google_secret_manager_secret_version.db_password.secret_data
  tier               = "db-f1-micro"
  labels             = local.labels
  high_availability  = false
  deletion_protection = false
}

module "redis" {
  source         = "../../modules/redis_memorystore"
  project_id     = var.project_id
  region         = var.region
  name           = "app-redis-dev"
  memory_size_gb = 1
  tier           = "BASIC"
  labels         = local.labels
}

module "storage" {
  source      = "../../modules/storage_gcs"
  project_id  = var.project_id
  location    = var.region
  bucket_name = "app-frontend-dev"
  labels      = local.labels
  create_bucket = false
}

module "cloud_run" {
  source         = "../../modules/cloud_run_services"
  project_id     = var.project_id
  region         = var.region
  backend_image  = var.backend_image
  frontend_image = var.frontend_image

  db_connection_string = module.sql.uri
  db_user              = module.sql.db_user
  db_name              = module.sql.db_name
  db_host              = module.sql.public_ip
  db_port              = 5432
  db_password_secret_name = "db-password"
  redis_host           = module.redis.host
  redis_port           = module.redis.port
  bucket_name          = module.storage.bucket_name
  vertex_project_id    = var.project_id
  vertex_region        = var.vertex_region
  cors_origins         = var.allowed_origins
  cors_origin_regex    = var.allowed_origin_regex
  encrypt_key_secret_name = var.encrypt_key_secret_name
  backend_url_override = var.backend_url_override
  project_name         = var.project_name
  cloud_run_deletion_protection = false
  vpc_connector        = local.vpc_connector_full_name
  labels               = local.labels
  backend_cpu          = "1"
  backend_memory       = "1Gi"
  backend_min_instances = 0
  backend_max_instances = 1
  frontend_cpu         = "1"
  frontend_memory      = "512Mi"
  frontend_min_instances = 0
  frontend_max_instances = 1
  web_concurrency     = 1
}

module "pubsub_scheduler" {
  source              = "../../modules/pubsub_scheduler"
  project_id          = var.project_id
  region              = var.region
  push_endpoint       = "${local.backend_url_for_pubsub}/api/v1/pubsub/push"
  push_service_account = module.cloud_run.backend_service_account
  labels              = local.labels
}

module "vertex_ai" {
  source                  = "../../modules/vertex_ai"
  project_id              = var.project_id
  region                  = var.vertex_region
  backend_service_account = module.cloud_run.backend_service_account
}

module "secret_access" {
  source           = "../../modules/iam_secret_access"
  project_id       = var.project_id
  backend_sa_email = module.cloud_run.backend_service_account
}

resource "google_service_usage_consumer_quota_override" "vertex_ai" {
  provider = google-beta
  for_each = {
    for override in var.vertex_ai_quota_overrides :
    "${override.service}:${override.metric}:${override.limit}:${join(",", sort(keys(override.dimensions)))}" => override
  }

  project        = var.project_id
  service        = each.value.service
  metric         = urlencode(each.value.metric)
  limit          = urlencode(each.value.limit)
  override_value = each.value.override_value
  force          = true
  dimensions     = each.value.dimensions
}
