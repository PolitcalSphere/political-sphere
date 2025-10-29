variable "region" {
  description = "AWS region to deploy infrastructure into."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment identifier (dev, staging, prod)."
  type        = string
}

variable "tags" {
  description = "Common tags applied to all resources."
  type        = map(string)
  default = {
    Project     = "political-sphere"
    Terraform   = "true"
    ManagedBy   = "terraform"
  }
}

variable "vpc" {
  description = "Configuration for the VPC module."
  type = object({
    name              = string
    cidr_block        = string
    azs               = list(string)
    public_subnets    = list(string)
    private_subnets   = list(string)
    enable_nat_gateway = optional(bool, true)
  })
}

variable "eks" {
  description = "Configuration for the EKS module."
  type = object({
    cluster_name    = string
    cluster_version = optional(string, "1.29")
    node_groups     = optional(map(object({
      instance_types = list(string)
      desired_size   = number
      min_size       = number
      max_size       = number
      disk_size      = optional(number)
      capacity_type  = optional(string)
      labels         = optional(map(string))
      taints         = optional(list(object({
        key    = string
        value  = string
        effect = string
      })))
    })), null)
    log_types   = optional(list(string))
    enable_irsa = optional(bool)
  })
}

variable "rds" {
  description = "Configuration for the RDS module."
  type = object({
    identifier              = string
    engine_version          = optional(string, "15.4")
    instance_class          = optional(string, "db.m6g.large")
    allocated_storage       = optional(number, 100)
    max_allocated_storage   = optional(number, 1000)
    username                = string
    password                = string
    database_name           = optional(string, "politicalsphere")
    multi_az                = optional(bool, false)
    backup_retention_period = optional(number, 7)
    preferred_backup_window = optional(string, "04:00-06:00")
    preferred_maintenance_window = optional(string, "sun:06:00-sun:07:00")
    deletion_protection     = optional(bool, true)
    storage_encrypted       = optional(bool, true)
    kms_key_id              = optional(string, "")
  })
  sensitive = true
}

variable "redis" {
  description = "Configuration for Redis module."
  type = object({
    replication_group_id  = string
    engine_version        = optional(string, "7.1")
    node_type             = optional(string, "cache.t4g.small")
    number_cache_clusters = optional(number, 2)
    multi_az_enabled      = optional(bool, true)
    auth_token            = optional(string, "")
  })
  default   = null
  sensitive = true
}

variable "ecr_repositories" {
  description = "Map of ECR repositories to provision."
  type        = map(any)
}

variable "ecr_replication_rules" {
  description = "Optional ECR replication rules."
  type        = list(any)
  default     = []
}

variable "route53_zone" {
  description = "Route53 hosted zone configuration."
  type = object({
    zone_name  = string
    comment    = optional(string, "Managed by Terraform")
    records    = optional(map(any), {})
    vpc_id     = optional(string, "")
    vpc_region = optional(string, "")
  })
}

variable "acm" {
  description = "ACM certificate configuration."
  type = object({
    domain_name               = string
    subject_alternative_names = optional(list(string), [])
    validation_method         = optional(string, "DNS")
    zone_id                   = optional(string, "")
  })
}

variable "s3_buckets" {
  description = "Map of S3 bucket configuration."
  type        = map(any)
  default     = {}
}

variable "kms" {
  description = "KMS configuration."
  type = object({
    description             = optional(string, "Political Sphere shared key")
    enable_key_rotation     = optional(bool, true)
    deletion_window_in_days = optional(number, 30)
    aliases                 = optional(list(string), [])
    key_administrators      = optional(list(string), [])
    key_users               = optional(list(string), [])
  })
}

variable "iam" {
  description = "IAM GitHub OIDC configuration."
  type = object({
    github_org               = string
    repositories             = list(string)
    role_name_prefix         = optional(string, "politicalsphere")
    permissions_boundary_arn = optional(string, "")
    policy_statements        = optional(list(object({
      sid       = optional(string)
      actions   = list(string)
      resources = list(string)
      effect    = optional(string, "Allow")
    })), [])
  })
}
