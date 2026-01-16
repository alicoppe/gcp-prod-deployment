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
  redis_host           = module.redis.host
  redis_port           = module.redis.port
  bucket_name          = module.storage.bucket_name
  vertex_project_id    = var.project_id
  vertex_region        = var.vertex_region
  cors_origins         = var.allowed_origins
  encrypt_key_secret_name = var.encrypt_key_secret_name
  vpc_connector        = null
  labels               = local.labels
  backend_cpu          = "1"
  backend_memory       = "512Mi"
  backend_min_instances = 0
  backend_max_instances = 1
  frontend_cpu         = "1"
  frontend_memory      = "512Mi"
  frontend_min_instances = 0
  frontend_max_instances = 1
}

module "pubsub_scheduler" {
  source              = "../../modules/pubsub_scheduler"
  project_id          = var.project_id
  region              = var.region
  push_endpoint       = "${module.cloud_run.backend_url}/pubsub/push"
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
