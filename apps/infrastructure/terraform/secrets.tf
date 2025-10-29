# AWS Secrets Manager for application secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name = "political-sphere/${var.environment}/app-secrets"

  tags = {
    Name        = "political-sphere-app-secrets"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    DATABASE_URL      = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_rds_cluster.political_sphere.endpoint}:5432/political_sphere"
    REDIS_URL         = "redis://${aws_elasticache_cluster.political_sphere.cache_nodes[0].address}:6379"
    JWT_SECRET        = random_password.jwt_secret.result
    API_KEY           = random_password.api_key.result
    ENCRYPTION_KEY    = random_password.encryption_key.result
  })
}

# Random passwords for secrets
resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "api_key" {
  length  = 32
  special = true
}

resource "random_password" "encryption_key" {
  length  = 32
  special = true
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "political_sphere" {
  name       = "political-sphere-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name        = "political-sphere-redis-subnet-group"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_elasticache_cluster" "political_sphere" {
  cluster_id           = "political-sphere-${var.environment}"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.political_sphere.name
  security_group_ids   = [aws_security_group.redis.id]

  tags = {
    Name        = "political-sphere-redis"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# Security group for Redis
resource "aws_security_group" "redis" {
  name_prefix = "political-sphere-redis-"
  vpc_id      = aws_vpc.political_sphere.id

  ingress {
    from_port       = 6379
    to_port         = 6379
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
    Name        = "political-sphere-redis-sg"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# IAM role for ECS task execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "political-sphere-${var.environment}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "political-sphere-ecs-task-execution"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM policy for accessing secrets
resource "aws_iam_role_policy" "secrets_access" {
  name = "political-sphere-${var.environment}-secrets-access"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.app_secrets.arn
      }
    ]
  })
}
