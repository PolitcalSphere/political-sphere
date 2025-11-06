# Distributed Tracing with Jaeger

resource "aws_ecs_service" "jaeger" {
  name            = "${var.environment}-jaeger"
  cluster         = aws_ecs_cluster.political_sphere.id
  task_definition = aws_ecs_task_definition.jaeger.arn
  desired_count   = 1

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.jaeger.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.jaeger.arn
    container_name   = "jaeger"
    container_port   = 16686
  }

  # Depend on whichever listener variant is created (redirect+https or forward).
  depends_on = concat(
    aws_lb_listener.jaeger_redirect[*],
    aws_lb_listener.jaeger_forward[*],
    aws_lb_listener.jaeger_https[*],
  )

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
    Service     = "tracing"
  }
}

resource "aws_ecs_task_definition" "jaeger" {
  family                   = "${var.environment}-jaeger"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "jaeger"
      image = "jaegertracing/all-in-one:latest"
      portMappings = [
        {
          containerPort = 16686
          hostPort      = 16686
          protocol      = "tcp"
        },
        {
          containerPort = 14268
          hostPort      = 14268
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "COLLECTOR_OTLP_ENABLED"
          value = "true"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.jaeger.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "jaeger"
        }
      }
    }
  ])

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# Load Balancer for Jaeger UI
resource "aws_lb" "jaeger" {
  name               = "${var.environment}-jaeger-lb"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [aws_security_group.jaeger_lb.id]
  subnets            = aws_subnet.private[*].id

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
    Service     = "tracing"
  }
}

resource "aws_lb_target_group" "jaeger" {
  name        = "${var.environment}-jaeger-tg"
  port        = 16686
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

// Two alternatives for the HTTP listener: either redirect -> HTTPS (secure) or
// forward directly to the target group. We create only one of these depending
// on var.enable_jaeger_https to avoid requiring certificates in non-prod.
resource "aws_lb_listener" "jaeger_redirect" {
  count             = var.enable_jaeger_https ? 1 : 0
  load_balancer_arn = aws_lb.jaeger.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "jaeger_forward" {
  count             = var.enable_jaeger_https ? 0 : 1
  load_balancer_arn = aws_lb.jaeger.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.jaeger.arn
  }
}

// HTTPS listener for Jaeger (internal). Use a modern TLS policy when enabled.
resource "aws_lb_listener" "jaeger_https" {
  count             = var.enable_jaeger_https ? 1 : 0
  load_balancer_arn = aws_lb.jaeger.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-Res-2021-06"
  certificate_arn   = aws_acm_certificate.political_sphere.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.jaeger.arn
  }
}

# Security Groups
resource "aws_security_group" "jaeger" {
  name_prefix = "${var.environment}-jaeger-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 16686
    to_port     = 16686
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  ingress {
    from_port   = 14268
    to_port     = 14268
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

resource "aws_security_group" "jaeger_lb" {
  name_prefix = "${var.environment}-jaeger-lb-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
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
resource "aws_cloudwatch_log_group" "jaeger" {
  name              = "/ecs/${var.environment}-jaeger"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.cloudwatch_logs.arn

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# IAM Roles (assuming these are defined elsewhere)
# These would need to be created if not already present
data "aws_iam_role" "ecs_execution" {
  name = "${var.environment}-ecs-execution-role"
}

data "aws_iam_role" "ecs_task" {
  name = "${var.environment}-ecs-task-role"
}
