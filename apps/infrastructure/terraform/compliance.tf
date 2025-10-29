# Compliance Configuration for GDPR, CCPA, and other regulations

# CloudTrail for audit logging (required for compliance)
resource "aws_cloudtrail" "compliance" {
  name                          = "${var.environment}-political-sphere-compliance-trail"
  s3_bucket_name                = aws_s3_bucket.political_sphere.bucket
  s3_key_prefix                 = "compliance-logs"
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.political_sphere.bucket}/compliance-data/*"]
    }

    data_resource {
      type   = "AWS::Lambda::Function"
      values = ["*"]
    }
  }

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
    Compliance  = "GDPR-CCPA"
  }
}

# Config Rules for compliance monitoring
resource "aws_config_config_rule" "s3_encryption" {
  name = "${var.environment}-s3-bucket-server-side-encryption-enabled"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }

  scope {
    compliance_resource_types = ["AWS::S3::Bucket"]
  }

  tags = {
    Environment = var.environment
    Compliance  = "GDPR-CCPA"
  }
}

resource "aws_config_config_rule" "rds_encryption" {
  name = "${var.environment}-rds-storage-encrypted"

  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }

  scope {
    compliance_resource_types = ["AWS::RDS::DBInstance"]
  }

  tags = {
    Environment = var.environment
    Compliance  = "GDPR-CCPA"
  }
}

resource "aws_config_config_rule" "cloudtrail_enabled" {
  name = "${var.environment}-cloudtrail-enabled"

  source {
    owner             = "AWS"
    source_identifier = "CLOUD_TRAIL_ENABLED"
  }

  tags = {
    Environment = var.environment
    Compliance  = "GDPR-CCPA"
  }
}

resource "aws_config_config_rule" "root_mfa" {
  name = "${var.environment}-root-account-mfa-enabled"

  source {
    owner             = "AWS"
    source_identifier = "ROOT_ACCOUNT_MFA_ENABLED"
  }

  tags = {
    Environment = var.environment
    Compliance  = "GDPR-CCPA"
  }
}

# GuardDuty for threat detection
resource "aws_guardduty_detector" "compliance" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
    Compliance  = "GDPR-CCPA"
  }
}

# Macie for data classification and PII detection
resource "aws_macie2_account" "compliance" {
  finding_publishing_frequency = "FIFTEEN_MINUTES"
  status                      = "ENABLED"
}

# Data residency and sovereignty (for GDPR compliance)
resource "aws_config_config_rule" "data_residency" {
  name = "${var.environment}-data-residency-check"

  source {
    owner             = "AWS"
    source_identifier = "CLOUDTRAIL_S3_DATAEVENTS_ENABLED"
  }

  scope {
    compliance_resource_types = ["AWS::S3::Bucket"]
  }

  tags = {
    Environment = var.environment
    Compliance  = "GDPR"
    DataSovereignty = "EU"
  }
}

# Automated compliance reporting
resource "aws_config_configuration_recorder" "compliance" {
  name     = "${var.environment}-political-sphere-compliance-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_iam_role" "config" {
  name = "${var.environment}-political-sphere-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Compliance  = "GDPR-CCPA"
  }
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSConfigRole"
}

# Compliance monitoring dashboard (placeholder for future implementation)
resource "aws_cloudwatch_dashboard" "compliance" {
  dashboard_name = "${var.environment}-political-sphere-compliance"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Config", "ComplianceRulesEvaluated", "RuleName", "${aws_config_config_rule.s3_encryption.name}"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "S3 Encryption Compliance"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Config", "ComplianceRulesEvaluated", "RuleName", "${aws_config_config_rule.rds_encryption.name}"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "RDS Encryption Compliance"
          period  = 300
        }
      }
    ]
  })
}
