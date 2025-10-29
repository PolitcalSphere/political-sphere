# Log Aggregation and AI-Powered Anomaly Detection

resource "aws_ecs_service" "fluent_bit" {
  name            = "${var.environment}-fluent-bit"
  cluster         = aws_ecs_cluster.political_sphere.id
  task_definition = aws_ecs_task_definition.fluent_bit.arn
  desired_count   = 1

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.fluent_bit.id]
  }

  depends_on = [aws_lb_listener.fluent_bit]

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
    Service     = "logging"
  }
}

resource "aws_ecs_task_definition" "fluent_bit" {
  family                   = "${var.environment}-fluent-bit"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "fluent-bit"
      image = "fluent/fluent-bit:latest"
      portMappings = [
        {
          containerPort = 2020
          hostPort      = 2020
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "FLUENT_ELASTICSEARCH_HOST"
          value = aws_elasticsearch_domain.political_sphere.endpoint
        },
        {
          name  = "FLUENT_ELASTICSEARCH_PORT"
          value = "443"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.fluent_bit.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "fluent-bit"
        }
      }
      mountPoints = [
        {
          sourceVolume  = "config"
          containerPath = "/fluent-bit/etc"
          readOnly      = true
        }
      ]
    }
  ])

  volume {
    name = "config"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.fluent_bit.id
      root_directory = "/"
    }
  }

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# Elasticsearch for log storage and analysis
resource "aws_elasticsearch_domain" "political_sphere" {
  domain_name           = "${var.environment}-political-sphere-logs"
  elasticsearch_version = "OpenSearch_2.5"

  cluster_config {
    instance_type          = "t3.small.elasticsearch"
    instance_count         = 2
    zone_awareness_enabled = true

    zone_awareness_config {
      availability_zone_count = 2
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 20
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name     = "admin"
      master_user_password = random_password.elasticsearch.result
    }
  }

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "random_password" "elasticsearch" {
  length  = 16
  special = true
}

# AI Anomaly Detection Service
resource "aws_ecs_service" "ai_anomaly_detector" {
  name            = "${var.environment}-ai-anomaly-detector"
  cluster         = aws_ecs_cluster.political_sphere.id
  task_definition = aws_ecs_task_definition.ai_anomaly_detector.arn
  desired_count   = 1

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ai_anomaly_detector.id]
  }

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
    Service     = "ai-anomaly-detection"
  }
}

resource "aws_ecs_task_definition" "ai_anomaly_detector" {
  family                   = "${var.environment}-ai-anomaly-detector"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "ai-anomaly-detector"
      image = "python:3.9-slim"
      environment = [
        {
          name  = "OPENSEARCH_ENDPOINT"
          value = aws_elasticsearch_domain.political_sphere.endpoint
        },
        {
          name  = "PROMETHEUS_ENDPOINT"
          value = "http://prometheus.${var.environment}.local:9090"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ai_anomaly_detector.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ai-anomaly-detector"
        }
      }
      essential = true
    }
  ])

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# EFS for Fluent Bit configuration
resource "aws_efs_file_system" "fluent_bit" {
  creation_token = "${var.environment}-fluent-bit-config"

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_efs_mount_target" "fluent_bit" {
  count          = length(aws_subnet.private)
  file_system_id = aws_efs_file_system.fluent_bit.id
  subnet_id      = aws_subnet.private[count.index].id
  security_groups = [aws_security_group.efs.id]
}

# Security Groups
resource "aws_security_group" "fluent_bit" {
  name_prefix = "${var.environment}-fluent-bit-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 2020
    to_port     = 2020
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_security_group" "ai_anomaly_detector" {
  name_prefix = "${var.environment}-ai-anomaly-detector-"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_security_group" "efs" {
  name_prefix = "${var.environment}-efs-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 2049
    to_port     = 2049
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# CloudWatch Logs
resource "aws_cloudwatch_log_group" "fluent_bit" {
  name              = "/ecs/${var.environment}-fluent-bit"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_cloudwatch_log_group" "ai_anomaly_detector" {
  name              = "/ecs/${var.environment}-ai-anomaly-detector"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# Fluent Bit configuration file
resource "aws_efs_file" "fluent_bit_config" {
  file_system_id = aws_efs_file_system.fluent_bit.id
  path          = "/fluent-bit.conf"
  content = <<-EOF
    [SERVICE]
        Flush         5
        Log_Level     info
        Daemon        off

    [INPUT]
        Name              forward
        Listen            0.0.0.0
        Port              24224

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token

    [FILTER]
        Name                grep
        Match               *
        Exclude            log ^.*healthcheck.*$

    [OUTPUT]
        Name                opensearch
        Match               *
        Host                ${aws_elasticsearch_domain.political_sphere.endpoint}
        Port                443
        Index               political-sphere-logs
        Type                _doc
        TLS                 On
        AWS_Auth            On
        AWS_Region          ${var.aws_region}
  EOF
}
