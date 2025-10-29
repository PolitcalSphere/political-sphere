locals {
  tags = merge(var.tags, {
    ManagedBy = "terraform"
    GitHubOrg = var.github_org
  })
}

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]

  tags = local.tags
}

locals {
  assume_role_policy = { for repo in var.repositories : repo => jsonencode({
    Version = "2012-10-17"
    Statement = [{
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
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${repo}:*"
        }
      }
    }]
  }) }
}

resource "aws_iam_role" "github" {
  for_each           = local.assume_role_policy
  name               = "${var.role_name_prefix}-${replace(each.key, "/", "-")}-gha"
  assume_role_policy = each.value
  permissions_boundary = length(var.permissions_boundary_arn) > 0 ? var.permissions_boundary_arn : null

  tags = merge(local.tags, {
    Repository = each.key
  })
}

resource "aws_iam_role_policy" "github_inline" {
  for_each = length(var.policy_statements) > 0 ? aws_iam_role.github : {}

  name = "${each.value.name}-inline"
  role = each.value.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [for statement in var.policy_statements : {
      Sid      = lookup(statement, "sid", null)
      Effect   = lookup(statement, "effect", "Allow")
      Action   = statement.actions
      Resource = statement.resources
    }]
  })
}
