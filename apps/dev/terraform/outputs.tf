output "s3_bucket_name" {
  description = "Name of the created S3 bucket"
  value       = aws_s3_bucket.political_sphere_dev.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the created S3 bucket"
  value       = aws_s3_bucket.political_sphere_dev.arn
}

output "sqs_queue_url" {
  description = "URL of the created SQS queue"
  value       = aws_sqs_queue.political_sphere_queue.url
}

output "sqs_queue_arn" {
  description = "ARN of the created SQS queue"
  value       = aws_sqs_queue.political_sphere_queue.arn
}

output "iam_role_arn" {
  description = "ARN of the created IAM role"
  value       = aws_iam_role.political_sphere_role.arn
}

output "database_secret_arn" {
  description = "ARN of the database URL secret"
  value       = aws_secretsmanager_secret.database_url.arn
}
