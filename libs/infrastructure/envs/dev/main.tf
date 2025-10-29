terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "political-sphere-terraform-state"
    key            = "dev/terraform.tfstate"
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
        instance_types = ["t3.large"]
        desired_size   = 2
        min_size       = 1
        max_size       = 3
        disk_size      = 50
      }
    }
    log_types  = ["api", "audit", "authenticator"]
    enable_irsa = true
  }

  rds = {
    identifier              = "${var.environment}-postgres"
    username                = var.rds_username
    password                = var.rds_password
    database_name           = "politicalsphere"
    multi_az                = false
    allocated_storage       = 50
    max_allocated_storage   = 200
    instance_class          = "db.t4g.medium"
    backup_retention_period = 7
    preferred_backup_window = "03:00-05:00"
    preferred_maintenance_window = "sat:06:00-sat:07:00"
    deletion_protection     = false
    storage_encrypted       = true
    kms_key_id              = ""
  }

  redis = var.enable_redis ? {
    replication_group_id  = "${var.environment}-redis"
    engine_version        = "7.1"
    node_type             = "cache.t4g.small"
    number_cache_clusters = 1
    multi_az_enabled      = false
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
        }]
        expiration = {
          days = 365
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
      tags = {
        DataClassification = "logs"
      }
    }
  }

  ecr_repositories = {
    "political-sphere/${var.environment}/api" = {
      image_tag_mutability = "IMMUTABLE"
      lifecycle_policy = {
        tag_status = "any"
        count      = 50
      }
    }
    "political-sphere/${var.environment}/frontend" = {
      image_tag_mutability = "IMMUTABLE"
      lifecycle_policy = {
        tag_status = "any"
        count      = 50
      }
    }
    "political-sphere/${var.environment}/worker" = {
      image_tag_mutability = "IMMUTABLE"
      lifecycle_policy = {
        tag_status = "any"
        count      = 50
      }
    }
    "political-sphere/${var.environment}/agents" = {
      image_tag_mutability = "IMMUTABLE"
      lifecycle_policy = {
        tag_status = "any"
        count      = 50
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
    deletion_window_in_days = 7
    aliases                 = ["alias/political-sphere-${var.environment}"]
    key_administrators      = var.kms_administrators
    key_users               = var.kms_users
  }

  iam = {
    github_org               = var.github_org
    repositories             = var.github_repositories
    role_name_prefix         = "politicalsphere-${var.environment}"
    permissions_boundary_arn = var.github_permissions_boundary
    policy_statements        = local.github_policy_statements
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
}

module "environment" {
  source = "../.."

  region      = var.region
  environment = var.environment
  tags        = local.base_tags

  vpc             = local.vpc
  eks             = local.eks
  rds             = local.rds
  redis           = local.redis
  ecr_repositories = local.ecr_repositories
  route53_zone    = local.route53_zone
  acm             = local.acm
  s3_buckets      = local.s3_buckets
  kms             = local.kms
  iam             = local.iam
}
