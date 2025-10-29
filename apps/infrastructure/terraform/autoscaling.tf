# Application Auto Scaling for ECS
resource "aws_appautoscaling_target" "api" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.political_sphere.name}/api"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "political-sphere-api-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

resource "aws_appautoscaling_policy" "api_memory" {
  name               = "political-sphere-api-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 80.0
  }
}

# Frontend Auto Scaling
resource "aws_appautoscaling_target" "frontend" {
  max_capacity       = 5
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.political_sphere.name}/frontend"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "frontend_cpu" {
  name               = "political-sphere-frontend-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.frontend.resource_id
  scalable_dimension = aws_appautoscaling_target.frontend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.frontend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 60.0
  }
}

# Worker Auto Scaling (if applicable)
resource "aws_appautoscaling_target" "worker" {
  count              = var.enable_worker_service ? 1 : 0
  max_capacity       = 3
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.political_sphere.name}/worker"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "worker_cpu" {
  count              = var.enable_worker_service ? 1 : 0
  name               = "political-sphere-worker-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.worker[0].resource_id
  scalable_dimension = aws_appautoscaling_target.worker[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.worker[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 75.0
  }
}

# CloudWatch Alarms for scaling
resource "aws_cloudwatch_metric_alarm" "api_high_cpu" {
  alarm_name          = "political-sphere-api-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ecs cpu utilization"
  alarm_actions       = []

  dimensions = {
    ClusterName = aws_ecs_cluster.political_sphere.name
    ServiceName = "api"
  }
}

# Cost optimization - Reserved Instances (example)
resource "aws_ec2_capacity_reservation" "political_sphere" {
  count             = var.enable_capacity_reservation ? 1 : 0
  availability_zone = element(var.availability_zones, 0)
  instance_type     = "t3.medium"
  instance_count    = 2

  tags = {
    Name        = "political-sphere-capacity-reservation"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# Spot instances for cost optimization (if enabled)
resource "aws_ecs_capacity_provider" "spot" {
  count = var.enable_spot_instances ? 1 : 0
  name  = "political-sphere-spot"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.spot[0].arn
    managed_termination_protection = "ENABLED"

    managed_scaling {
      maximum_scaling_step_size = 10
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 90
    }
  }
}

resource "aws_autoscaling_group" "spot" {
  count             = var.enable_spot_instances ? 1 : 0
  name_prefix       = "political-sphere-spot-"
  max_size          = 10
  min_size          = 0
  desired_capacity  = 1

  launch_template {
    id      = aws_launch_template.spot[0].id
    version = "$Latest"
  }

  vpc_zone_identifier = aws_subnet.private[*].id

  tag {
    key                 = "Name"
    value               = "political-sphere-spot-instance"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  tag {
    key                 = "Project"
    value               = "political-sphere"
    propagate_at_launch = true
  }
}

resource "aws_launch_template" "spot" {
  count         = var.enable_spot_instances ? 1 : 0
  name_prefix   = "political-sphere-spot-"
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = "t3.medium"

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance.name
  }

  vpc_security_group_ids = [aws_security_group.ecs.id]

  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    cluster_name = aws_ecs_cluster.political_sphere.name
  }))

  instance_market_options {
    market_type = "spot"
    spot_options {
      max_price = "0.10"
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "political-sphere-spot-instance"
      Environment = var.environment
      Project     = "political-sphere"
    }
  }
}

data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-*-x86_64-ebs"]
  }
}

resource "aws_iam_instance_profile" "ecs_instance" {
  name = "political-sphere-${var.environment}-ecs-instance"
  role = aws_iam_role.ecs_instance.name
}

resource "aws_iam_role" "ecs_instance" {
  name = "political-sphere-${var.environment}-ecs-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_instance" {
  role       = aws_iam_role.ecs_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}
