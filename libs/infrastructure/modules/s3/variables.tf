variable "buckets" {
  description = "Map of bucket names to configuration."
  type = map(object({
    acl                         = optional(string, "private")
    force_destroy               = optional(bool, false)
    versioning_enabled          = optional(bool, true)
    lifecycle_rules             = optional(list(object({
      id      = string
      enabled = bool
      transition = optional(list(object({
        days          = number
        storage_class = string
      })), [])
      expiration = optional(object({
        days = number
      }), null)
    })), [])
    cors_rules = optional(list(object({
      allowed_headers = optional(list(string), [])
      allowed_methods = list(string)
      allowed_origins = list(string)
      expose_headers  = optional(list(string), [])
      max_age_seconds = optional(number, 0)
    })), [])
    server_side_encryption = optional(object({
      sse_algorithm     = string
      kms_master_key_id = optional(string)
    }), null)
    logging = optional(object({
      target_bucket = string
      target_prefix = optional(string, "logs/")
    }), null)
    public_access_block = optional(object({
      block_public_acls       = optional(bool, true)
      block_public_policy     = optional(bool, true)
      ignore_public_acls      = optional(bool, true)
      restrict_public_buckets = optional(bool, true)
    }), null)
    replication_configuration = optional(object({
      role  = string
      rules = list(object({
        id       = string
        status   = string
        filter   = optional(object({ prefix = optional(string) }), null)
        destination = object({
          bucket        = string
          storage_class = optional(string)
        })
      }))
    }), null)
    tags = optional(map(string), {})
  }))
}

variable "common_tags" {
  description = "Tags merged into every bucket."
  type        = map(string)
  default     = {}
}
