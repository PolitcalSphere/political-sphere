variable "github_org" {
  description = "GitHub organization owning the repositories."
  type        = string
}

variable "repositories" {
  description = "List of repositories that require IAM roles (name only)."
  type        = list(string)
}

variable "role_name_prefix" {
  description = "Prefix for created IAM roles."
  type        = string
  default     = "politicalsphere"
}

variable "permissions_boundary_arn" {
  description = "Optional permissions boundary ARN to apply to roles."
  type        = string
  default     = ""
}

variable "policy_statements" {
  description = "Inline policy statements to attach to each role."
  type        = list(object({
    sid       = optional(string)
    actions   = list(string)
    resources = list(string)
    effect    = optional(string, "Allow")
  }))
  default = []
}

variable "tags" {
  description = "Common tags for IAM resources."
  type        = map(string)
  default     = {}
}
