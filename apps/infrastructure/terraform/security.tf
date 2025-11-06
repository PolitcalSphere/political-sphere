# WAF (Web Application Firewall)
resource "aws_wafv2_web_acl" "political_sphere" {
  name        = "political-sphere-waf-${var.environment}"
  description = "WAF for Political Sphere ${var.environment}"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # OWASP Top 10 Protections
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Rate limiting
  rule {
    name     = "RateLimit"
    priority = 4

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }

  # Geo blocking (optional)
  dynamic "rule" {
    for_each = var.blocked_countries
    content {
      name     = "GeoBlock-${rule.value}"
      priority = 5 + rule.key

      action {
        block {}
      }

      statement {
        geo_match_statement {
          country_codes = [rule.value]
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "GeoBlock-${rule.value}"
        sampled_requests_enabled   = true
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "political-sphere-waf-${var.environment}"
    sampled_requests_enabled   = true
  }
}

# WAF Association with ALB
resource "aws_wafv2_web_acl_association" "political_sphere" {
  resource_arn = aws_lb.political_sphere.arn
  web_acl_arn  = aws_wafv2_web_acl.political_sphere.arn
}

# Application Load Balancer
resource "aws_lb" "political_sphere" {
  name               = "political-sphere-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "prod"

  tags = {
    Name        = "political-sphere-alb"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# ALB Target Groups
resource "aws_lb_target_group" "api" {
  name        = "political-sphere-api-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.political_sphere.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name        = "political-sphere-api-tg"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_lb_target_group" "frontend" {
  name        = "political-sphere-frontend-${var.environment}"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.political_sphere.id
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
    Name        = "political-sphere-frontend-tg"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# ALB Listeners
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.political_sphere.arn
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

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.political_sphere.arn
  port              = "443"
  protocol          = "HTTPS"
  # Use a modern, secure TLS policy (TLS 1.2+ and TLS 1.3 compatible)
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-Res-2021-06"
  certificate_arn   = aws_acm_certificate.political_sphere.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# ALB Listener Rules
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# ACM Certificate
resource "aws_acm_certificate" "political_sphere" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  tags = {
    Name        = "political-sphere-cert"
    Environment = var.environment
    Project     = "political-sphere"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Route 53 Records for Certificate Validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.political_sphere.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.political_sphere.zone_id
}

# Certificate Validation
resource "aws_acm_certificate_validation" "political_sphere" {
  certificate_arn         = aws_acm_certificate.political_sphere.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route 53 Zone (data source - assumes zone exists)
data "aws_route53_zone" "political_sphere" {
  name         = var.domain_name
  private_zone = false
}

# Route 53 Records
resource "aws_route53_record" "alb" {
  zone_id = data.aws_route53_zone.political_sphere.zone_id
  name    = var.environment == "prod" ? var.domain_name : "${var.environment}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.political_sphere.dns_name
    zone_id                = aws_lb.political_sphere.zone_id
    evaluate_target_health = true
  }
}

# Shield Advanced (for production)
resource "aws_shield_protection" "political_sphere" {
  count = var.environment == "prod" ? 1 : 0
  name  = "political-sphere-shield-${var.environment}"
  resource_arn = aws_lb.political_sphere.arn
}

# GuardDuty (threat detection)
resource "aws_guardduty_detector" "political_sphere" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = false
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }

  tags = {
    Name        = "political-sphere-guardduty"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# Config Rules for compliance
resource "aws_config_config_rule" "s3_bucket_versioning" {
  name = "s3-bucket-versioning-enabled"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_VERSIONING_ENABLED"
  }

  scope {
    compliance_resource_types = ["AWS::S3::Bucket"]
  }
}

resource "aws_config_config_rule" "rds_encryption" {
  name = "rds-storage-encrypted"

  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }

  scope {
    compliance_resource_types = ["AWS::RDS::DBInstance"]
  }
}

# CloudTrail for audit logging
resource "aws_cloudtrail" "political_sphere" {
  name                          = "political-sphere-trail-${var.environment}"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  s3_key_prefix                 = "cloudtrail"
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.political_sphere.arn}/"]
    }
  }

  tags = {
    Name        = "political-sphere-cloudtrail"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# S3 bucket for CloudTrail logs
resource "aws_s3_bucket" "cloudtrail" {
  bucket = "political-sphere-cloudtrail-${var.environment}-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "political-sphere-cloudtrail"
    Environment = var.environment
    Project     = "political-sphere"
  }
}

resource "aws_s3_bucket_versioning" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  policy = data.aws_iam_policy_document.cloudtrail.json
}

data "aws_iam_policy_document" "cloudtrail" {
  statement {
    sid    = "AWSCloudTrailAclCheck"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions   = ["s3:GetBucketAcl"]
    resources = [aws_s3_bucket.cloudtrail.arn]
  }

  statement {
    sid    = "AWSCloudTrailWrite"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.cloudtrail.arn}/cloudtrail/AWSLogs/*"]

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
  }
}
