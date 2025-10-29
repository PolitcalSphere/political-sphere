variable "zone_name" {
  description = "Fully qualified domain name for the hosted zone."
  type        = string
}

variable "comment" {
  description = "Comment for the hosted zone."
  type        = string
  default     = "Managed by Terraform"
}

variable "tags" {
  description = "Tags applied to the hosted zone."
  type        = map(string)
  default     = {}
}

variable "records" {
  description = "Map of record names to definitions."
  type = map(object({
    type    = string
    ttl     = optional(number, 300)
    records = optional(list(string))
    alias = optional(object({
      name                   = string
      zone_id                = string
      evaluate_target_health = optional(bool, false)
    }))
  }))
  default = {}
}

variable "vpc_id" {
  description = "Optional VPC ID for private hosted zones."
  type        = string
  default     = ""
}

variable "vpc_region" {
  description = "Region of the VPC for private hosted zones."
  type        = string
  default     = ""
}
