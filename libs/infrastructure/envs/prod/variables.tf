variable "region" {
  description = "AWS region for the production environment."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment label."
  type        = string
  default     = "prod"
}

variable "availability_zones" {
  description = "Availability zones to use."
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "vpc_cidr_block" {
  description = "CIDR block for the production VPC."
  type        = string
  default     = "10.30.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks."
  type        = list(string)
  default     = [
    "10.30.0.0/24",
    "10.30.1.0/24",
    "10.30.2.0/24"
  ]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks."
  type        = list(string)
  default     = [
    "10.30.10.0/24",
    "10.30.11.0/24",
    "10.30.12.0/24"
  ]
}

variable "enable_nat_gateway" {
  description = "Provision NAT gateways for private subnet egress."
  type        = bool
  default     = true
}

variable "extra_tags" {
  description = "Additional tags for production resources."
  type        = map(string)
  default     = {}
}

variable "primary_domain" {
  description = "Primary domain for production."
  type        = string
  default     = "political-sphere.example"
}

variable "additional_domains" {
  description = "SAN entries for ACM certificate."
  type        = list(string)
  default     = [
    "api.political-sphere.example",
    "frontend.political-sphere.example"
  ]
}

variable "route53_zone_name" {
  description = "Route53 zone for production."
  type        = string
  default     = "political-sphere.example"
}

variable "rds_username" {
  description = "Database master username."
  type        = string
  default     = "prod_admin"
}

variable "rds_password" {
  description = "Database master password."
  type        = string
  sensitive   = true
}

variable "enable_redis" {
  description = "Provision Redis cluster."
  type        = bool
  default     = true
}

variable "redis_auth_token" {
  description = "Redis auth token."
  type        = string
  sensitive   = true
  default     = ""
}

variable "kms_administrators" {
  description = "KMS admin principals."
  type        = list(string)
  default     = []
}

variable "kms_users" {
  description = "KMS usage principals."
  type        = list(string)
  default     = []
}

variable "github_org" {
  description = "GitHub organization."
  type        = string
  default     = "political-sphere"
}

variable "github_repositories" {
  description = "GitHub repositories with deployment pipelines."
  type        = list(string)
  default     = [
    "infrastructure",
    "platform",
    "ci",
    "dev"
  ]
}

variable "github_permissions_boundary" {
  description = "Optional permissions boundary for GitHub roles."
  type        = string
  default     = ""
}
