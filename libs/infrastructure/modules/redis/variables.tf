variable "replication_group_id" {
  description = "Identifier for the ElastiCache replication group."
  type        = string
}

variable "engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

variable "node_type" {
  description = "Instance type for cache nodes."
  type        = string
  default     = "cache.t4g.small"
}

variable "number_cache_clusters" {
  description = "Number of cache nodes (for cluster mode disabled)."
  type        = number
  default     = 2
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ with automatic failover."
  type        = bool
  default     = true
}

variable "subnet_ids" {
  description = "Subnet IDs for the subnet group."
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security groups to associate with the replication group."
  type        = list(string)
  default     = []
}

variable "at_rest_encryption_enabled" {
  description = "Enable encryption at rest."
  type        = bool
  default     = true
}

variable "in_transit_encryption_enabled" {
  description = "Enable TLS for in-transit encryption."
  type        = bool
  default     = true
}

variable "auth_token" {
  description = "Auth token for Redis AUTH (store in Secrets Manager/Vault)."
  type        = string
  sensitive   = true
  default     = ""
}

variable "tags" {
  description = "Common tags for Redis resources."
  type        = map(string)
  default     = {}
}
