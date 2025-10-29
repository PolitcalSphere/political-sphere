locals {
  common_tags = merge(var.tags, {
    Environment = var.environment
  })
  redis_config = try(var.redis, null)
}

module "kms" {
  source = "./modules/kms"

  description             = lookup(var.kms, "description", "Political Sphere shared key")
  enable_key_rotation     = lookup(var.kms, "enable_key_rotation", true)
  deletion_window_in_days = lookup(var.kms, "deletion_window_in_days", 30)
  aliases                 = lookup(var.kms, "aliases", [])
  key_administrators      = lookup(var.kms, "key_administrators", [])
  key_users               = lookup(var.kms, "key_users", [])
  tags                    = local.common_tags
}

module "iam" {
  source = "./modules/iam"

  github_org               = var.iam.github_org
  repositories             = var.iam.repositories
  role_name_prefix         = lookup(var.iam, "role_name_prefix", "politicalsphere")
  permissions_boundary_arn = lookup(var.iam, "permissions_boundary_arn", "")
  policy_statements        = lookup(var.iam, "policy_statements", [])
  tags                     = local.common_tags
}

module "vpc" {
  source = "./modules/vpc"

  name               = var.vpc.name
  cidr_block         = var.vpc.cidr_block
  azs                = var.vpc.azs
  public_subnets     = var.vpc.public_subnets
  private_subnets    = var.vpc.private_subnets
  enable_nat_gateway = lookup(var.vpc, "enable_nat_gateway", true)
  tags               = local.common_tags
}

module "s3" {
  source = "./modules/s3"

  buckets     = var.s3_buckets
  common_tags = local.common_tags
}

module "ecr" {
  source = "./modules/ecr"

  repositories      = var.ecr_repositories
  replication_rules = var.ecr_replication_rules
  tags              = local.common_tags
}

module "route53" {
  source = "./modules/route53"

  zone_name  = var.route53_zone.zone_name
  comment    = lookup(var.route53_zone, "comment", "Managed by Terraform")
  records    = lookup(var.route53_zone, "records", {})
  vpc_id     = lookup(var.route53_zone, "vpc_id", "")
  vpc_region = lookup(var.route53_zone, "vpc_region", "")
  tags       = local.common_tags
}

module "acm" {
  source = "./modules/acm"

  domain_name               = var.acm.domain_name
  subject_alternative_names = lookup(var.acm, "subject_alternative_names", [])
  validation_method         = lookup(var.acm, "validation_method", "DNS")
  zone_id                   = length(lookup(var.acm, "zone_id", "")) > 0 ? lookup(var.acm, "zone_id", "") : module.route53.zone_id
  tags                      = local.common_tags
}

resource "aws_security_group" "rds" {
  name        = "${var.environment}-rds"
  description = "Database access security group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${var.environment}-rds" })
}

resource "aws_security_group" "redis" {
  for_each    = local.redis_config == null ? {} : { primary = local.redis_config }
  name        = "${var.environment}-redis"
  description = "Redis access security group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${var.environment}-redis" })
}

module "eks" {
  source = "./modules/eks"

  cluster_name       = var.eks.cluster_name
  cluster_version    = lookup(var.eks, "cluster_version", "1.29")
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids
  node_groups        = coalesce(lookup(var.eks, "node_groups", null), {})
  enable_irsa        = lookup(var.eks, "enable_irsa", true)
  cluster_log_types  = coalesce(lookup(var.eks, "log_types", null), ["api", "audit", "authenticator", "controllerManager", "scheduler"])
  tags               = local.common_tags
}

module "rds" {
  source = "./modules/rds"

  identifier              = var.rds.identifier
  engine_version          = lookup(var.rds, "engine_version", "15.4")
  instance_class          = lookup(var.rds, "instance_class", "db.m6g.large")
  allocated_storage       = lookup(var.rds, "allocated_storage", 100)
  max_allocated_storage   = lookup(var.rds, "max_allocated_storage", 1000)
  username                = var.rds.username
  password                = var.rds.password
  database_name           = lookup(var.rds, "database_name", "politicalsphere")
  subnet_ids              = module.vpc.private_subnet_ids
  vpc_security_group_ids  = [aws_security_group.rds.id]
  multi_az                = lookup(var.rds, "multi_az", false)
  backup_retention_period = lookup(var.rds, "backup_retention_period", 7)
  preferred_backup_window = lookup(var.rds, "preferred_backup_window", "04:00-06:00")
  preferred_maintenance_window = lookup(var.rds, "preferred_maintenance_window", "sun:06:00-sun:07:00")
  deletion_protection     = lookup(var.rds, "deletion_protection", true)
  storage_encrypted       = lookup(var.rds, "storage_encrypted", true)
  kms_key_id              = lookup(var.rds, "kms_key_id", "")
  tags                    = local.common_tags
}

module "redis" {
  source   = "./modules/redis"
  for_each = local.redis_config == null ? {} : { primary = local.redis_config }

  replication_group_id          = each.value.replication_group_id
  engine_version                = lookup(each.value, "engine_version", "7.1")
  node_type                     = lookup(each.value, "node_type", "cache.t4g.small")
  number_cache_clusters         = lookup(each.value, "number_cache_clusters", 2)
  multi_az_enabled              = lookup(each.value, "multi_az_enabled", true)
  subnet_ids                    = module.vpc.private_subnet_ids
  security_group_ids            = values(aws_security_group.redis)[*].id
  at_rest_encryption_enabled    = true
  in_transit_encryption_enabled = true
  auth_token                    = lookup(each.value, "auth_token", "")
  tags                          = local.common_tags
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnet_ids" {
  value = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  value = module.vpc.public_subnet_ids
}

output "eks_cluster_id" {
  value = module.eks.cluster_id
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_cluster_ca" {
  value = module.eks.cluster_certificate_authority
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "redis_primary_endpoint" {
  value = local.redis_config == null ? null : module.redis["primary"].primary_endpoint
}

output "route53_zone_id" {
  value = module.route53.zone_id
}

output "acm_certificate_arn" {
  value = module.acm.certificate_arn
}

output "kms_key_arn" {
  value = module.kms.key_arn
}

output "github_roles" {
  value = module.iam.role_arns
}
