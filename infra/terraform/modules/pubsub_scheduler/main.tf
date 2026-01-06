resource "google_project_service" "pubsub_api" {
  project = var.project_id
  service = "pubsub.googleapis.com"
}

resource "google_project_service" "scheduler_api" {
  project = var.project_id
  service = "cloudscheduler.googleapis.com"
}

resource "google_pubsub_topic" "scheduled" {
  name    = var.topic_name
  project = var.project_id
  labels  = var.labels
  depends_on = [google_project_service.pubsub_api]
}

resource "google_pubsub_subscription" "scheduled_push" {
  name  = var.subscription_name
  topic = google_pubsub_topic.scheduled.name

  push_config {
    push_endpoint = var.push_endpoint
    oidc_token {
      service_account_email = var.push_service_account
    }
  }

  depends_on = [google_pubsub_topic.scheduled]
}

resource "google_cloud_scheduler_job" "job" {
  name        = var.job_name
  project     = var.project_id
  region      = var.region
  description = "Publishes to Pub/Sub to trigger backend work"
  schedule    = var.schedule
  time_zone   = var.time_zone

  pubsub_target {
    topic_name = google_pubsub_topic.scheduled.id
    data       = base64encode(var.payload_json)
  }

  depends_on = [google_project_service.scheduler_api, google_pubsub_topic.scheduled]
}
