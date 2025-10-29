terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "political-sphere-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "political-sphere-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region
}

locals {
  base_tags = merge({
    Environment = var.environment
    Project     = "political-sphere"
    Tier        = "production"
  }, var.extra_tags)

  vpc = {
    name              = "${var.environment}-core"
    cidr_block        = var.vpc_cidr_block
    azs               = var.availability_zones
    public_subnets    = var.public_subnet_cidrs
    private_subnets   = var.private_subnet_cidrs
    enable_nat_gateway = var.enable_nat_gateway
  }

  eks = {
    cluster_name    = "${var.environment}-eks"
    cluster_version = "1.29"
    node_groups = {
      general = {
        instance_types = ["m6i.xlarge"]
        desired_size   = 4
        min_size       = 3
        max_size       = 8
        disk_size      = 100
      }
      spot = {
        instance_types = ["m6i.xlarge", "m6a.xlarge", "m5n.xlarge"]
        desired_size   = 2
        min_size       = 0
        max_size       = 6
        capacity_type  = "SPOT"
        disk_size      = 80
        labels = {
          lifecycle = "spot"
        }
        taints = [{
          key    = "workload"
          value  = "batch"
          effect = "PREFER_NO_SCHEDULE"
        }]
      }
    }
    log_types  = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
    enable_irsa = true
  }

  rds = {
    identifier              = "${var.environment}-postgres"
    username                = var.rds_username
    password                = var.rds_password
    database_name           = "politicalsphere"
    multi_az                = true
    allocated_storage       = 200
    max_allocated_storage   = 1000
    instance_class          = "db.m6g.xlarge"
    backup_retention_period = 35
    preferred_backup_window = "01:00-03:00"
    preferred_maintenance_window = "sat:04:00-sat:05:00"
    deletion_protection     = true
    storage_encrypted       = true
    kms_key_id              = ""
  }

  redis = var.enable_redis ? {
    replication_group_id  = "${var.environment}-redis"
    engine_version        = "7.1"
    node_type             = "cache.m6g.large"
    number_cache_clusters = 3
    multi_az_enabled      = true
    auth_token            = var.redis_auth_token
  } : null

  s3_buckets = {
    "political-sphere-${var.environment}-artifacts" = {
      versioning_enabled = true
      lifecycle_rules = [{
        id      = "retain-artifacts"
        enabled = true
        transition = [{
          days          = 30
          storage_class = "STANDARD_IA"
        }, {
          days          = 180
          storage_class = "GLACIER"
        }]
        expiration = {
          days = 730
        }
      }]
      public_access_block = {
        block_public_acls       = true
        ignore_public_acls      = true
        block_public_policy     = true
        restrict_public_buckets = true
      }
      tags = {
        DataClassification = "internal"
      }
    }
    "political-sphere-${var.environment}-logs" = {
      versioning_enabled = true
      force_destroy      = false
      logging = {
        target_bucket = "political-sphere-${var.environment}-backups"
        target_prefix = "log-delivery/"
      }
      tags = {
        DataClassification = "logs"
      }
    }
    "political-sphere-${var.environment}-backups" = {
      versioning_enabled = true
      lifecycle_rules = [{
        id      = "retain-backups"
        enabled = true
        transition = [{
          days          = 30
          storage_class = "STANDARD_IA"
        }, {
          days          = 90
          storage_class = "GLACIER_IR"
        }]
        expiration = {
          days = 1095
        }
      }]
      public_access_block = {
        block_public_acls       = true
        ignore_public_acls      = true
        block_public_policy     = true
        restrict_public_buckets = true
      }
      tags = {
        DataClassification = "backups"
      }
    }
  }

  ecr_repositories = {
    "political-sphere/${var.environment}/api" = {
      image_tag_mutability = "IMMUTABLE"
      lifecycle_policy = {
        tag_status = "any"
        count      = 150
      }
    }
    "political-sphere/${var.environment}/frontend" = {
      image_tag_mutability = "IMMUTABLE"
      lifecycle_policy = {
        tag_status = "any"
        count      = 150
      }
    }
    "political-sphere/${var.environment}/worker" = {
      image_tag_mutability = "IMMUTABLE"
      lifecycle_policy = {
        tag_status = "any"
        count      = 150
      }
    }
    "political-sphere/${var.environment}/agents" = {
      image_tag_mutability = "IMMUTABLE"
      lifecycle_policy = {
        tag_status = "any"
        count      = 150
      }
    }
  }

  route53_zone = {
    zone_name = var.route53_zone_name
    comment   = "Managed by Terraform"
    records   = {}
  }

  acm = {
    domain_name               = var.primary_domain
    subject_alternative_names = var.additional_domains
    validation_method         = "DNS"
    zone_id                   = ""
  }

  kms = {
    description             = "Political Sphere ${var.environment} key"
    enable_key_rotation     = true
    deletion_window_in_days = 30
    aliases                 = ["alias/political-sphere-${var.environment}"]
    key_administrators      = var.kms_administrators
    key_users               = var.kms_users
  }

  github_policy_statements = [
    {
      sid       = "AllowECR"
      actions   = [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories",
        "ecr:GetRepositoryPolicy"
      ]
      resources = ["*"]
    },
    {
      sid       = "AllowLogs"
      actions   = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      resources = ["*"]
    },
    {
      sid       = "AllowS3Artifacts"
      actions   = [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ]
      resources = [
        "arn:aws:s3:::political-sphere-${var.environment}-artifacts",
        "arn:aws:s3:::political-sphere-${var.environment}-artifacts/*"
      ]
    }
  ]

  iam = {
    github_org               = var.github_org
    repositories             = var.github_repositories
    role_name_prefix         = "politicalsphere-${var.environment}"
    permissions_boundary_arn = var.github_permissions_boundary
    policy_statements        = local.github_policy_statements
  }
}

module "environment" {
  source = "../.."

  region      = var.region
  environment = var.environment
  tags        = local.base_tags

  vpc              = local.vpc
  eks              = local.eks
  rds              = local.rds
  redis            = local.redis
  ecr_repositories = local.ecr_repositories
  route53_zone     = local.route53_zone
  acm              = local.acm
  s3_buckets       = local.s3_buckets
  kms              = local.kms
  iam              = local.iam
}
