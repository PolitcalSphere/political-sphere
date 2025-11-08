locals {
  tags = merge(var.tags, {
    ManagedBy = "terraform"
  })
}

resource "aws_ecr_registry_scanning_configuration" "this" {
  scan_type = "ENHANCED"

  rule {
    scan_frequency = "SCAN_ON_PUSH"

    repository_filter {
      filter      = "*"
      filter_type = "WILDCARD"
    }
  }
}

resource "aws_ecr_replication_configuration" "this" {
  count = length(var.replication_rules) > 0 ? 1 : 0

  replication_configuration {
    dynamic "rule" {
      for_each = var.replication_rules
      content {
        dynamic "destination" {
          for_each = rule.value.destinations
          content {
            region      = destination.value.region
            registry_id = lookup(destination.value, "registry_id", null)
          }
        }

        dynamic "repository_filter" {
          for_each = lookup(rule.value, "repository_filters", [])
          content {
            filter      = repository_filter.value.filter
            filter_type = repository_filter.value.filter_type
          }
        }
      }
    }
  }
}

resource "aws_ecr_repository" "this" {
  for_each = var.repositories

  name = each.key
  
  # Security: Set to IMMUTABLE to prevent image tag overwriting
  # Mutable tags allow attackers to replace trusted images with compromised ones
  # Reference: CIS AWS Foundations Benchmark, OWASP Container Security
  # To deploy new versions, use unique tags (e.g., git SHA, semantic version)
  image_tag_mutability = lookup(each.value, "image_tag_mutability", "IMMUTABLE")

  # Security: Enable image scanning on push to detect vulnerabilities
  # Reference: CIS AWS Foundations Benchmark 4.8, AWS ECR Security Best Practices
  # Scans are performed automatically when images are pushed to the repository
  image_scanning_configuration {
    scan_on_push = lookup(each.value, "scan_on_push", true)
  }

  encryption_configuration {
    encryption_type = lookup(each.value, "encryption_type", "AES256")
    kms_key         = lookup(each.value, "kms_key", "") == "" ? null : lookup(each.value, "kms_key", "")
  }

  force_delete = false
  tags         = merge(local.tags, { Repository = each.key })
}

resource "aws_ecr_lifecycle_policy" "this" {
  for_each = { for k, v in var.repositories : k => v.lifecycle_policy if v.lifecycle_policy != null }

  repository = aws_ecr_repository.this[each.key].name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Retain ${each.value.count} images for ${each.value.tag_status} tags"
      selection = {
        tagStatus = each.value.tag_status
        countType = "imageCountMoreThan"
        countNumber = each.value.count
      }
      action = {
        type = "expire"
      }
    }]
  })
}
