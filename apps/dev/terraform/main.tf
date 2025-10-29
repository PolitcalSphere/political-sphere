terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region                      = var.aws_region
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    s3     = "http://localstack:4566"
    sqs    = "http://localstack:4566"
    sts    = "http://localstack:4566"
    iam    = "http://localstack:4566"
    secretsmanager = "http://localstack:4566"
  }
}

resource "aws_s3_bucket" "political_sphere_dev" {
  bucket = var.s3_bucket_name

  tags = {
    Environment = "dev"
    Project     = "political-sphere"
  }
}

resource "aws_s3_bucket_versioning" "political_sphere_dev" {
  bucket = aws_s3_bucket.political_sphere_dev.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_sqs_queue" "political_sphere_queue" {
  name = var.sqs_queue_name

  tags = {
    Environment = "dev"
    Project     = "political-sphere"
  }
}

resource "aws_iam_role" "political_sphere_role" {
  name = var.iam_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = "dev"
    Project     = "political-sphere"
  }
}

resource "aws_iam_role_policy_attachment" "political_sphere_s3" {
  role       = aws_iam_role.political_sphere_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_secretsmanager_secret" "database_url" {
  name = "political-sphere/database-url"

  tags = {
    Environment = "dev"
    Project     = "political-sphere"
  }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = jsonencode({
    DATABASE_URL = var.database_url
  })
}
