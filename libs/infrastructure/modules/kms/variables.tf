variable "description" {
  description = "Description for the KMS key."
  type        = string
  default     = "Political Sphere shared key"
}

variable "enable_key_rotation" {
  description = "Enable automatic key rotation."
  type        = bool
  default     = true
}

variable "deletion_window_in_days" {
  description = "Waiting period for key deletion."
  type        = number
  default     = 30
}

variable "aliases" {
  description = "List of aliases to create for the key."
  type        = list(string)
  default     = []
}

variable "key_administrators" {
  description = "List of IAM principals that can administer the key."
  type        = list(string)
  default     = []
}

variable "key_users" {
  description = "List of IAM principals that can use the key."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags for the KMS key."
  type        = map(string)
  default     = {}
}
