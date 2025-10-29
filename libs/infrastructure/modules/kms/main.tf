locals {
  tags = merge(var.tags, {
    ManagedBy = "terraform"
  })
}

resource "aws_kms_key" "this" {
  description             = var.description
  enable_key_rotation     = var.enable_key_rotation
  deletion_window_in_days = var.deletion_window_in_days

  tags = local.tags

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = concat(
      [
        {
          Sid    = "EnableRootPermissions"
          Effect = "Allow"
          Principal = {
            AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
          }
          Action   = "kms:*"
          Resource = "*"
        }
      ],
      [for admin in var.key_administrators : {
        Sid    = "AllowAdministration${replace(admin, ":", "-")}"
        Effect = "Allow"
        Principal = {
          AWS = admin
        }
        Action = [
          "kms:Describe*",
          "kms:List*",
          "kms:Get*",
          "kms:Create*",
          "kms:Update*",
          "kms:Enable*",
          "kms:Revoke*",
          "kms:Disable*",
          "kms:Delete*",
          "kms:TagResource",
          "kms:UntagResource",
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion"
        ]
        Resource = "*"
      }],
      [for user in var.key_users : {
        Sid    = "AllowUsage${replace(user, ":", "-")}"
        Effect = "Allow"
        Principal = {
          AWS = user
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }]
    )
  })
}

data "aws_caller_identity" "current" {}

resource "aws_kms_alias" "this" {
  for_each = toset(var.aliases)

  name          = startswith(each.value, "alias/") ? each.value : "alias/${each.value}"
  target_key_id = aws_kms_key.this.id
}
