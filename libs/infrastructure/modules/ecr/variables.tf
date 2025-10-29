variable "repositories" {
  description = "Map of repository names to configuration."
  type = map(object({
    image_tag_mutability = optional(string, "MUTABLE")
    scan_on_push         = optional(bool, true)
    encryption_type      = optional(string, "AES256")
    kms_key              = optional(string, "")
    lifecycle_policy     = optional(object({
      tag_status = string
      count      = number
    }), null)
  }))
}

variable "replication_rules" {
  description = "Optional ECR replication rules."
  type = list(object({
    destinations = list(object({
      region = string
      registry_id = optional(string)
    }))
    repository_filters = optional(list(object({
      filter      = string
      filter_type = string
    })), [])
  }))
  default = []
}

variable "tags" {
  description = "Common tags for repositories."
  type        = map(string)
  default     = {}
}
