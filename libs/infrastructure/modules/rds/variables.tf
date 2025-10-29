variable "identifier" {
  description = "Identifier for the RDS instance."
  type        = string
}

variable "engine_version" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "15.4"
}

variable "instance_class" {
  description = "Instance class for the database."
  type        = string
  default     = "db.m6g.large"
}

variable "allocated_storage" {
  description = "Allocated storage in GB."
  type        = number
  default     = 100
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage for autoscaling."
  type        = number
  default     = 1000
}

variable "username" {
  description = "Master username for the database."
  type        = string
}

variable "password" {
  description = "Master password (use Vault or Secrets Manager)."
  type        = string
  sensitive   = true
}

variable "database_name" {
  description = "Initial database name."
  type        = string
  default     = "politicalsphere"
}

variable "subnet_ids" {
  description = "List of subnet IDs for the RDS subnet group."
  type        = list(string)
}

variable "vpc_security_group_ids" {
  description = "Security groups attached to the RDS instance."
  type        = list(string)
  default     = []
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment."
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Number of days to retain backups."
  type        = number
  default     = 7
}

variable "preferred_backup_window" {
  description = "Backup window in UTC (hh24:mi-hh24:mi)."
  type        = string
  default     = "04:00-06:00"
}

variable "preferred_maintenance_window" {
  description = "Maintenance window."
  type        = string
  default     = "sun:06:00-sun:07:00"
}

variable "storage_encrypted" {
  description = "Whether storage is encrypted."
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "KMS key ID for encryption (optional)."
  type        = string
  default     = ""
}

variable "deletion_protection" {
  description = "Enable deletion protection."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to RDS resources."
  type        = map(string)
  default     = {}
}
