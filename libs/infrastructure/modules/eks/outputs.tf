output "cluster_id" {
  description = "ID of the EKS cluster."
  value       = aws_eks_cluster.this.id
}

output "cluster_endpoint" {
  description = "EKS API server endpoint."
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_certificate_authority" {
  description = "Certificate authority data for kubeconfig."
  value       = aws_eks_cluster.this.certificate_authority[0].data
}

output "cluster_security_group_id" {
  description = "Security group ID associated with the cluster."
  value       = aws_security_group.cluster.id
}

output "worker_security_group_id" {
  description = "Security group ID associated with worker nodes."
  value       = aws_security_group.worker.id
}

output "oidc_provider_arn" {
  description = "ARN of the IAM OIDC provider (if created)."
  value       = try(aws_iam_openid_connect_provider.this[0].arn, null)
}

output "node_role_arns" {
  description = "ARNs of worker node IAM roles."
  value       = { for k, v in aws_iam_role.node : k => v.arn }
}
