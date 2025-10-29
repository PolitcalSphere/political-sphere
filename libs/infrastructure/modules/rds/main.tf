locals {
  engine_major = split(".", var.engine_version)[0]
  tags = merge(var.tags, {
    Name = var.identifier
  })
}

resource "random_string" "snapshot_suffix" {
  length  = 8
  upper   = false
  special = false
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.identifier}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = local.tags
}

resource "aws_db_parameter_group" "this" {
  name        = "${var.identifier}-pg"
  family      = "postgres${local.engine_major}"
  description = "Parameter group for ${var.identifier}"

  tags = local.tags
}

resource "aws_db_instance" "this" {
  identifier              = var.identifier
  engine                  = "postgres"
  engine_version          = var.engine_version
  instance_class          = var.instance_class
  username                = var.username
  password                = var.password
  db_name                 = var.database_name
  allocated_storage       = var.allocated_storage
  max_allocated_storage   = var.max_allocated_storage
  db_subnet_group_name    = aws_db_subnet_group.this.name
  vpc_security_group_ids  = var.vpc_security_group_ids
  multi_az                = var.multi_az
  publicly_accessible     = false
  storage_encrypted       = var.storage_encrypted
  kms_key_id              = length(var.kms_key_id) > 0 ? var.kms_key_id : null
  backup_retention_period = var.backup_retention_period
  preferred_backup_window = var.preferred_backup_window
  maintenance_window      = var.preferred_maintenance_window
  deletion_protection     = var.deletion_protection
  apply_immediately       = false
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.identifier}-final-${random_string.snapshot_suffix.result}"
  auto_minor_version_upgrade = true
  performance_insights_enabled = true

  tags = local.tags

  depends_on = [aws_db_parameter_group.this]
}
