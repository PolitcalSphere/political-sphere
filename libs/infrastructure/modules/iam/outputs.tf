output "github_oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider."
  value       = aws_iam_openid_connect_provider.github.arn
}

output "role_arns" {
  description = "Map of repository name to IAM role ARN."
  value       = { for repo, role in aws_iam_role.github : repo => role.arn }
}
