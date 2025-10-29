locals {
  tags = merge(var.tags, {
    Name = var.replication_group_id
  })
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.replication_group_id}-subnets"
  subnet_ids = var.subnet_ids

  tags = local.tags
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id          = var.replication_group_id
  replication_group_description = "Redis replication group for ${var.replication_group_id}"
  engine                         = "redis"
  engine_version                 = var.engine_version
  node_type                      = var.node_type
  number_cache_clusters          = var.number_cache_clusters
  multi_az_enabled               = var.multi_az_enabled
  automatic_failover_enabled     = var.multi_az_enabled
  subnet_group_name              = aws_elasticache_subnet_group.this.name
  security_group_ids             = var.security_group_ids
  at_rest_encryption_enabled     = var.at_rest_encryption_enabled
  transit_encryption_enabled     = var.in_transit_encryption_enabled
  auth_token                     = length(var.auth_token) > 0 ? var.auth_token : null
  port                           = 6379
  apply_immediately              = false
  auto_minor_version_upgrade     = true

  tags = local.tags
}
