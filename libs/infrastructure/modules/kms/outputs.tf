output "key_arn" {
  description = "ARN of the created KMS key."
  value       = aws_kms_key.this.arn
}

output "alias_names" {
  description = "List of alias names associated with the key."
  value       = [for alias in aws_kms_alias.this : alias.name]
}
