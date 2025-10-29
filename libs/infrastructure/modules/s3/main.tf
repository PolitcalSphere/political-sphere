locals {
  buckets = {
    for name, cfg in var.buckets : name => {
      acl                         = lookup(cfg, "acl", "private")
      force_destroy               = lookup(cfg, "force_destroy", false)
      versioning_enabled          = lookup(cfg, "versioning_enabled", true)
      lifecycle_rules             = lookup(cfg, "lifecycle_rules", [])
      cors_rules                  = lookup(cfg, "cors_rules", [])
      server_side_encryption      = lookup(cfg, "server_side_encryption", null)
      logging                     = lookup(cfg, "logging", null)
      public_access_block         = lookup(cfg, "public_access_block", null)
      replication_configuration   = lookup(cfg, "replication_configuration", null)
      tags                        = lookup(cfg, "tags", {})
    }
  }
}

resource "aws_s3_bucket" "this" {
  for_each = local.buckets

  bucket        = each.key
  force_destroy = each.value.force_destroy
  acl           = each.value.acl

  tags = merge(var.common_tags, each.value.tags)
}

resource "aws_s3_bucket_ownership_controls" "this" {
  for_each = local.buckets

  bucket = aws_s3_bucket.this[each.key].id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  for_each = { for name, cfg in local.buckets : name => cfg.public_access_block if cfg.public_access_block != null }

  bucket = aws_s3_bucket.this[each.key].id

  block_public_acls       = lookup(each.value, "block_public_acls", true)
  ignore_public_acls      = lookup(each.value, "ignore_public_acls", true)
  block_public_policy     = lookup(each.value, "block_public_policy", true)
  restrict_public_buckets = lookup(each.value, "restrict_public_buckets", true)
}

resource "aws_s3_bucket_versioning" "this" {
  for_each = local.buckets

  bucket = aws_s3_bucket.this[each.key].id

  versioning_configuration {
    status = each.value.versioning_enabled ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  for_each = { for name, cfg in local.buckets : name => cfg.server_side_encryption if cfg.server_side_encryption != null }

  bucket = aws_s3_bucket.this[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = each.value.sse_algorithm
      kms_master_key_id = lookup(each.value, "kms_master_key_id", null)
    }
  }
}

resource "aws_s3_bucket_logging" "this" {
  for_each = { for name, cfg in local.buckets : name => cfg.logging if cfg.logging != null }

  bucket = aws_s3_bucket.this[each.key].id

  target_bucket = each.value.target_bucket
  target_prefix = lookup(each.value, "target_prefix", "logs/")
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  for_each = { for name, cfg in local.buckets : name => cfg.lifecycle_rules if length(cfg.lifecycle_rules) > 0 }

  bucket = aws_s3_bucket.this[each.key].id

  dynamic "rule" {
    for_each = each.value
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      dynamic "transition" {
        for_each = lookup(rule.value, "transition", [])
        content {
          days          = transition.value.days
          storage_class = transition.value.storage_class
        }
      }

      dynamic "expiration" {
        for_each = rule.value.expiration == null ? [] : [rule.value.expiration]
        content {
          days = expiration.value.days
        }
      }
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "this" {
  for_each = { for name, cfg in local.buckets : name => cfg.cors_rules if length(cfg.cors_rules) > 0 }

  bucket = aws_s3_bucket.this[each.key].id

  dynamic "cors_rule" {
    for_each = each.value
    content {
      allowed_headers = lookup(cors_rule.value, "allowed_headers", [])
      allowed_methods = cors_rule.value.allowed_methods
      allowed_origins = cors_rule.value.allowed_origins
      expose_headers  = lookup(cors_rule.value, "expose_headers", [])
      max_age_seconds = lookup(cors_rule.value, "max_age_seconds", 0)
    }
  }
}

resource "aws_s3_bucket_replication_configuration" "this" {
  for_each = { for name, cfg in local.buckets : name => cfg.replication_configuration if cfg.replication_configuration != null }

  bucket = aws_s3_bucket.this[each.key].id
  role   = each.value.role

  dynamic "rule" {
    for_each = each.value.rules
    content {
      id     = rule.value.id
      status = rule.value.status

      dynamic "filter" {
        for_each = lookup(rule.value, "filter", null) == null ? [] : [rule.value.filter]
        content {
          prefix = lookup(filter.value, "prefix", null)
        }
      }

      destination {
        bucket        = rule.value.destination.bucket
        storage_class = lookup(rule.value.destination, "storage_class", null)
      }
    }
  }
}

output "bucket_arns" {
  description = "Map of bucket names to ARNs."
  value       = { for name, bucket in aws_s3_bucket.this : name => bucket.arn }
}

output "bucket_names" {
  description = "Map of local names to bucket names."
  value       = { for name, bucket in aws_s3_bucket.this : name => bucket.bucket }
}
