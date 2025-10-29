# IAM Roles and Policies for RBAC

# Admin Role
resource "aws_iam_role" "admin" {
  name = "${var.environment}-political-sphere-admin"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
    Role        = "admin"
  }
}

resource "aws_iam_role_policy_attachment" "admin" {
  role       = aws_iam_role.admin.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Developer Role
resource "aws_iam_role" "developer" {
  name = "${var.environment}-political-sphere-developer"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
    Role        = "developer"
  }
}

resource "aws_iam_role_policy" "developer" {
  name = "${var.environment}-political-sphere-developer-policy"
  role = aws_iam_role.developer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:*",
          "ecr:*",
          "logs:*",
          "cloudwatch:*",
          "s3:*",
          "rds:Describe*",
          "rds:ListTagsForResource",
          "elasticache:Describe*",
          "elasticache:ListTagsForResource"
        ]
        Resource = "*"
      },
      {
        Effect = "Deny"
        Action = [
          "iam:*",
          "organizations:*",
          "billing:*",
          "support:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# Read-Only Role
resource "aws_iam_role" "readonly" {
  name = "${var.environment}-political-sphere-readonly"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
    Role        = "readonly"
  }
}

resource "aws_iam_role_policy" "readonly" {
  name = "${var.environment}-political-sphere-readonly-policy"
  role = aws_iam_role.readonly.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:Describe*",
          "ecs:List*",
          "ecr:Describe*",
          "ecr:List*",
          "logs:Describe*",
          "logs:Get*",
          "logs:List*",
          "logs:StartQuery",
          "logs:StopQuery",
          "logs:TestMetricFilter",
          "logs:FilterLogEvents",
          "cloudwatch:Describe*",
          "cloudwatch:Get*",
          "cloudwatch:List*",
          "s3:Get*",
          "s3:List*",
          "rds:Describe*",
          "rds:ListTagsForResource",
          "elasticache:Describe*",
          "elasticache:ListTagsForResource"
        ]
        Resource = "*"
      }
    ]
  })
}

# CI/CD Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "${var.environment}-political-sphere-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:political-sphere/*"
          }
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
    Role        = "ci-cd"
  }
}

resource "aws_iam_role_policy" "github_actions" {
  name = "${var.environment}-political-sphere-github-actions-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:DeregisterTaskDefinition",
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "cloudfront:CreateInvalidation"
        ]
        Resource = "*"
      }
    ]
  })
}

# GitHub OIDC Provider
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]

  tags = {
    Environment = var.environment
    Project     = "political-sphere"
  }
}

# Data source for current account
data "aws_caller_identity" "current" {}
