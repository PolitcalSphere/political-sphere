terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "political_sphere" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "political-sphere-vpc"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# Subnets
resource "aws_subnet" "public" {
  count             = length(var.public_subnet_cidrs)
  vpc_id            = aws_vpc.political_sphere.id
  cidr_block        = element(var.public_subnet_cidrs, count.index)
  availability_zone = element(var.availability_zones, count.index)

  tags = {
    Name        = "political-sphere-public-subnet-${count.index + 1}"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.political_sphere.id
  cidr_block        = element(var.private_subnet_cidrs, count.index)
  availability_zone = element(var.availability_zones, count.index)

  tags = {
    Name        = "political-sphere-private-subnet-${count.index + 1}"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "political_sphere" {
  vpc_id = aws_vpc.political_sphere.id

  tags = {
    Name        = "political-sphere-igw"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# NAT Gateway
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? 1 : 0

  tags = {
    Name        = "political-sphere-nat-eip"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_nat_gateway" "political_sphere" {
  count         = var.enable_nat_gateway ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "political-sphere-nat"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.political_sphere.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.political_sphere.id
  }

  tags = {
    Name        = "political-sphere-public-rt"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_route_table" "private" {
  count  = var.enable_nat_gateway ? 1 : 0
  vpc_id = aws_vpc.political_sphere.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.political_sphere[0].id
  }

  tags = {
    Name        = "political-sphere-private-rt"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = length(var.public_subnet_cidrs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = var.enable_nat_gateway ? length(var.private_subnet_cidrs) : 0
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[0].id
}

# Security Groups
resource "aws_security_group" "alb" {
  name_prefix = "political-sphere-alb-"
  vpc_id      = aws_vpc.political_sphere.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "political-sphere-alb-sg"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_security_group" "ecs" {
  name_prefix = "political-sphere-ecs-"
  vpc_id      = aws_vpc.political_sphere.id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "political-sphere-ecs-sg"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "political-sphere-rds-"
  vpc_id      = aws_vpc.political_sphere.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "political-sphere-rds-sg"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "political_sphere" {
  name = "political-sphere-${var.environment}"

  tags = {
    Name        = "political-sphere-cluster"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# RDS
resource "aws_db_subnet_group" "political_sphere" {
  name       = "political-sphere-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name        = "political-sphere-db-subnet-group"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_rds_cluster" "political_sphere" {
  cluster_identifier      = "political-sphere-${var.environment}"
  engine                  = "aurora-postgresql"
  engine_version          = "15.3"
  database_name           = "political_sphere"
  master_username         = var.db_username
  master_password         = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.political_sphere.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  skip_final_snapshot     = true
  backup_retention_period = 7

  tags = {
    Name        = "political-sphere-rds"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# S3
resource "aws_s3_bucket" "political_sphere" {
  bucket = "political-sphere-${var.environment}-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "political-sphere-s3"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_s3_bucket_versioning" "political_sphere" {
  bucket = aws_s3_bucket.political_sphere.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "random_string" "bucket_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# CloudFront
resource "aws_cloudfront_distribution" "political_sphere" {
  origin {
    domain_name = aws_s3_bucket.political_sphere.bucket_regional_domain_name
    origin_id   = "S3-political-sphere-${var.environment}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-political-sphere-${var.environment}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "political-sphere-cloudfront"
    Environment = var.environment
    Project     = "political-sphere"
  }
}
