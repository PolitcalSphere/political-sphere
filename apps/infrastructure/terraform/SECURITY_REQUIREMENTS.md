# Terraform Security Configuration

# Checkov/tfsec rules for infrastructure-as-code scanning

# This file documents required security configurations for Terraform resources

## CloudWatch Log Groups

- All aws_cloudwatch_log_group resources MUST include kms_key_id
- Log groups MUST have retention_in_days configured (max 30 days for dev, 90+ for prod)
- Example:
  ```hcl
  resource "aws_cloudwatch_log_group" "example" {
    name              = "/aws/example"
    retention_in_days = 30
    kms_key_id        = aws_kms_key.cloudwatch_logs.arn
  }
  ```

## KMS Keys

- All KMS keys MUST have enable_key_rotation = true
- Deletion window should be at least 7 days
- Keys MUST have appropriate IAM policies
- Example:
  ```hcl
  resource "aws_kms_key" "example" {
    description             = "KMS key for..."
    deletion_window_in_days = 7
    enable_key_rotation     = true
  }
  ```

## S3 Buckets

- MUST have server_side_encryption_configuration
- MUST have versioning enabled
- MUST have public access blocked
- Example:
  ```hcl
  resource "aws_s3_bucket" "example" {
    bucket = "example"

    versioning {
      enabled = true
    }

    server_side_encryption_configuration {
      rule {
        apply_server_side_encryption_by_default {
          sse_algorithm     = "aws:kms"
          kms_master_key_id = aws_kms_key.s3.arn
        }
      }
    }
  }
  ```

## RDS/Aurora

- MUST have storage_encrypted = true
- MUST specify kms_key_id
- MUST enable automated backups
- Example:
  ```hcl
  resource "aws_db_instance" "example" {
    storage_encrypted   = true
    kms_key_id         = aws_kms_key.rds.arn
    backup_retention_period = 7
  }
  ```

## Secrets Manager

- All secrets MUST use KMS encryption
- Example:
  ```hcl
  resource "aws_secretsmanager_secret" "example" {
    name       = "example"
    kms_key_id = aws_kms_key.secrets.arn
  }
  ```

## Security Groups

- NO ingress rules with cidr_blocks = ["0.0.0.0/0"] on sensitive ports
- Use specific CIDR blocks or security group references
- Document any 0.0.0.0/0 rules with justification

## Scanning Tools

Run these before terraform apply:

```bash
# Checkov - comprehensive IaC scanner
checkov -d apps/infrastructure/terraform

# tfsec - Terraform-specific security scanner
tfsec apps/infrastructure/terraform

# Terraform validate
terraform validate

# Terraform plan with detailed output
terraform plan -out=tfplan
```

## CI/CD Integration

These checks run automatically in:

- .github/workflows/security/security.yml (IaC scanning job)
- Pre-commit hooks (if configured)
- Pull request validation
