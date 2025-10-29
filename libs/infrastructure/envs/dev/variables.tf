variable "region" {
  description = "AWS region for the dev environment."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name override (defaults to dev)."
  type        = string
  default     = "dev"
}

variable "availability_zones" {
  description = "Availability zones to use for networking resources."
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "vpc_cidr_block" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.10.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets."
  type        = list(string)
  default     = [
    "10.10.0.0/24",
    "10.10.1.0/24"
  ]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets."
  type        = list(string)
  default     = [
    "10.10.10.0/24",
    "10.10.11.0/24"
  ]
}

variable "enable_nat_gateway" {
  description = "Provision NAT gateways for private subnet egress."
  type        = bool
  default     = true
}

variable "extra_tags" {
  description = "Additional tags to apply to resources."
  type        = map(string)
  default     = {}
}

variable "primary_domain" {
  description = "Primary domain for the dev environment."
  type        = string
  default     = "dev.political-sphere.example"
}

variable "additional_domains" {
  description = "Additional SANs for the ACM certificate."
  type        = list(string)
  default     = [
    "api.dev.political-sphere.example",
    "frontend.dev.political-sphere.example"
  ]
}

variable "route53_zone_name" {
  description = "Route53 hosted zone root domain."
  type        = string
  default     = "dev.political-sphere.example"
}

variable "rds_username" {
  description = "Database master username."
  type        = string
  default     = "dev_admin"
}

variable "rds_password" {
  description = "Database master password. Supply via TF_VAR_rds_password or tfvars."
  type        = string
  sensitive   = true
}

variable "enable_redis" {
  description = "Whether to provision a Redis cluster."
  type        = bool
  default     = true
}

variable "redis_auth_token" {
  description = "Redis auth token (leave blank to disable AUTH)."
  type        = string
  sensitive   = true
  default     = ""
}

variable "kms_administrators" {
  description = "IAM principals allowed to administer the KMS key."
  type        = list(string)
  default     = []
}

variable "kms_users" {
  description = "IAM principals allowed to use the KMS key."
  type        = list(string)
  default     = []
}

variable "github_org" {
  description = "GitHub organization name."
  type        = string
  default     = "political-sphere"
}

variable "github_repositories" {
  description = "Repositories that require deployment roles."
  type        = list(string)
  default     = [
    "infrastructure",
    "platform",
    "ci",
    "dev"
  ]
}

variable "github_permissions_boundary" {
  description = "Optional IAM permissions boundary ARN for GitHub roles."
  type        = string
  default     = ""
}
