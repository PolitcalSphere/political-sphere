output "primary_endpoint" {
  description = "Primary endpoint address of the replication group."
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Reader endpoint address."
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  description = "Port used by the replication group."
  value       = aws_elasticache_replication_group.this.port
}
