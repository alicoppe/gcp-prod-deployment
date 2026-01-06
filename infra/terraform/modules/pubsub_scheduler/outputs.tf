output "topic" {
  value = google_pubsub_topic.scheduled.name
}

output "subscription" {
  value = google_pubsub_subscription.scheduled_push.name
}
