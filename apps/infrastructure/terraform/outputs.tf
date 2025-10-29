output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.political_sphere.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.political_sphere.name
}

output "rds_cluster_endpoint" {
  description = "Endpoint of the RDS cluster"
  value       = aws_rds_cluster.political_sphere.endpoint
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.political_sphere.bucket
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.political_sphere.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.political_sphere.domain_name
}

# Kubernetes outputs
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.political_sphere.name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.political_sphere.endpoint
}

output "eks_cluster_certificate_authority_data" {
  description = "EKS cluster certificate authority data"
  value       = aws_eks_cluster.political_sphere.certificate_authority[0].data
}

# RBAC outputs
output "admin_role_arn" {
  description = "ARN of the admin IAM role"
  value       = aws_iam_role.admin.arn
}

output "developer_role_arn" {
  description = "ARN of the developer IAM role"
  value       = aws_iam_role.developer.arn
}

output "readonly_role_arn" {
  description = "ARN of the readonly IAM role"
  value       = aws_iam_role.readonly.arn
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM role"
  value       = aws_iam_role.github_actions.arn
}

# Tracing outputs
output "jaeger_endpoint" {
  description = "Jaeger UI endpoint"
  value       = aws_lb.jaeger.dns_name
}

output "jaeger_collector_endpoint" {
  description = "Jaeger collector OTLP endpoint"
  value       = "${aws_lb.jaeger.dns_name}:14268"
}

# Logging outputs
output "elasticsearch_endpoint" {
  description = "Elasticsearch/OpenSearch endpoint for log analysis"
  value       = aws_elasticsearch_domain.political_sphere.endpoint
}

output "elasticsearch_kibana_endpoint" {
  description = "Kibana endpoint for log visualization"
  value       = aws_elasticsearch_domain.political_sphere.kibana_endpoint
}

output "fluent_bit_endpoint" {
  description = "Fluent Bit log ingestion endpoint"
  value       = "${aws_lb.fluent_bit.dns_name}:2020"
}

# Business Intelligence outputs
output "redshift_endpoint" {
  description = "Redshift cluster endpoint for analytics"
  value       = aws_redshift_cluster.political_sphere_bi.endpoint
}

output "redshift_database" {
  description = "Redshift database name"
  value       = aws_redshift_cluster.political_sphere_bi.database_name
}

output "quicksight_url" {
  description = "QuickSight console URL"
  value       = "https://${var.aws_region}.quicksight.aws.amazon.com"
}

output "data_lake_bucket" {
  description = "S3 bucket for data lake"
  value       = aws_s3_bucket.data_lake.bucket
}
