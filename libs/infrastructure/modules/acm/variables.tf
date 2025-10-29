variable "domain_name" {
  description = "Primary domain name for the certificate."
  type        = string
}

variable "subject_alternative_names" {
  description = "Additional SANs for the certificate."
  type        = list(string)
  default     = []
}

variable "validation_method" {
  description = "Validation method for the certificate."
  type        = string
  default     = "DNS"
}

variable "zone_id" {
  description = "Route53 hosted zone ID to create validation records in. Required for DNS validation."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags applied to the certificate."
  type        = map(string)
  default     = {}
}
