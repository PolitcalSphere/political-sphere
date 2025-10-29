output "certificate_arn" {
  description = "ARN of the ACM certificate."
  value       = aws_acm_certificate.this.arn
}

output "validation_records" {
  description = "Route53 validation records (if created)."
  value       = { for name, record in aws_route53_record.validation : name => {
    name   = record.name
    type   = record.type
    record = record.records[0]
    ttl    = record.ttl
  } }
  sensitive = false
}
