# Business Intelligence and Analytics Infrastructure

resource "aws_redshift_cluster" "political_sphere_bi" {
  cluster_identifier = "${var.environment}-political-sphere-bi"
  database_name      = "political_sphere_analytics"
  master_username    = "admin"
  master_password    = random_password.redshift.result
  node_type          = "dc2.large"
  cluster_type       = "single-node"

  vpc_security_group_ids = [aws_security_group.redshift.id]
  cluster_subnet_group_name = aws_redshift_subnet_group.political_sphere.name

  encrypted = true
  kms_key_id = aws_kms_key.redshift.arn

  logging {
    enable        = true
    bucket_name   = aws_s3_bucket.redshift_logs.bucket
    s3_key_prefix = "redshift-logs/"
  }

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
    Service     = "business-intelligence"
  }
}

resource "random_password" "redshift" {
  length  = 16
  special = true
}

resource "aws_kms_key" "redshift" {
  description = "KMS key for Redshift encryption"
  deletion_window_in_days = 7

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_redshift_subnet_group" "political_sphere" {
  name       = "${var.environment}-political-sphere-bi"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# QuickSight for Business Intelligence
resource "aws_quicksight_account_subscription" "political_sphere" {
  account_name          = "Political Sphere BI"
  authentication_method = "IAM_AND_QUICKSIGHT"
  edition               = "ENTERPRISE"
  notification_email    = var.admin_email
}

resource "aws_quicksight_data_source" "redshift" {
  data_source_id = "${var.environment}-redshift-datasource"
  name           = "Political Sphere Redshift"

  parameters {
    redshift {
      database = aws_redshift_cluster.political_sphere_bi.database_name
      host     = aws_redshift_cluster.political_sphere_bi.endpoint
      port     = aws_redshift_cluster.political_sphere_bi.port
    }
  }

  credentials {
    credential_pair {
      username = aws_redshift_cluster.political_sphere_bi.master_username
      password = aws_redshift_cluster.political_sphere_bi.master_password
    }
  }

  vpc_connection_properties {
    vpc_connection_arn = aws_quicksight_vpc_connection.political_sphere.arn
  }

  depends_on = [aws_quicksight_account_subscription.political_sphere]
}

resource "aws_quicksight_vpc_connection" "political_sphere" {
  vpc_connection_id  = "${var.environment}-vpc-connection"
  name               = "Political Sphere VPC Connection"
  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.quicksight.id]
  role_arn           = aws_iam_role.quicksight_vpc.arn

  depends_on = [aws_quicksight_account_subscription.political_sphere]
}

# S3 bucket for Redshift logs
resource "aws_s3_bucket" "redshift_logs" {
  bucket = "${var.environment}-political-sphere-redshift-logs-${random_string.bucket_suffix.result}"

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_s3_bucket_versioning" "redshift_logs" {
  bucket = aws_s3_bucket.redshift_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "redshift_logs" {
  bucket = aws_s3_bucket.redshift_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "random_string" "bucket_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# Security Groups
resource "aws_security_group" "redshift" {
  name_prefix = "${var.environment}-redshift-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5439
    to_port     = 5439
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_security_group" "quicksight" {
  name_prefix = "${var.environment}-quicksight-"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# IAM Roles
resource "aws_iam_role" "quicksight_vpc" {
  name = "${var.environment}-quicksight-vpc-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "quicksight.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_iam_role_policy_attachment" "quicksight_vpc" {
  role       = aws_iam_role.quicksight_vpc.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSQuickSightVPCConnectionRole"
}

# Data pipeline for ETL
resource "aws_glue_catalog_database" "political_sphere_analytics" {
  name = "${var.environment}_political_sphere_analytics"
}

resource "aws_glue_crawler" "user_analytics" {
  database_name = aws_glue_catalog_database.political_sphere_analytics.name
  name          = "${var.environment}-user-analytics-crawler"
  role          = aws_iam_role.glue.arn

  s3_target {
    path = "s3://${aws_s3_bucket.data_lake.bucket}/analytics/user-events/"
  }

  configuration = jsonencode({
    Version = 1.0
    Grouping = {
      TableGroupingPolicy = "CombineCompatibleSchemas"
    }
  })

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_iam_role" "glue" {
  name = "${var.environment}-glue-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "glue.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_iam_role_policy_attachment" "glue" {
  role       = aws_iam_role.glue.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole"
}

# S3 bucket for data lake
resource "aws_s3_bucket" "data_lake" {
  bucket = "${var.environment}-political-sphere-data-lake-${random_string.data_lake_suffix.result}"

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_s3_bucket_versioning" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "random_string" "data_lake_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}
