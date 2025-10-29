variable "aws_region" {
  description = "AWS region for localstack"
  type        = string
  default     = "us-east-1"
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for development"
  type        = string
  default     = "political-sphere-dev"
}

variable "sqs_queue_name" {
  description = "Name of the SQS queue for development"
  type        = string
  default     = "political-sphere-queue"
}

variable "iam_role_name" {
  description = "Name of the IAM role for development"
  type        = string
  default     = "political-sphere-dev-role"
}

variable "database_url" {
  description = "Database URL for the application"
  type        = string
  default     = "postgres://political:changeme@postgres:5432/political_dev"
}
