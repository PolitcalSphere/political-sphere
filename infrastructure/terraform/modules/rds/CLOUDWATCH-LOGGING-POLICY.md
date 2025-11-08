# RDS CloudWatch Logging Policy

**Version:** 1.0.0  
**Last Updated:** 2025-01-08  
**Owner:** Infrastructure Team

## Policy Statement

**All RDS database instances MUST enable CloudWatch Logs export for security auditing, incident response, and operational monitoring.**

## Security Rationale

### Compliance Requirements

- **CIS AWS Foundations Benchmark 2.3.1**: Database logging should be enabled for audit trail
- **NIST SP 800-53 r5 AU-2**: Audit Events - Organizations must identify auditable events
- **NIST SP 800-53 r5 AU-3**: Content of Audit Records - Records must contain sufficient information
- **OWASP ASVS 4.0.3 V7.1.3**: Security logs must be stored securely and retained
- **GDPR Article 32**: Logging security events for data breach detection

### Security Benefits

1. **Incident Detection**: Enables detection of suspicious queries, authentication failures, and anomalous database activity
2. **Forensic Analysis**: Provides audit trail for security incident investigations
3. **Compliance Auditing**: Demonstrates logging controls for compliance frameworks
4. **Performance Monitoring**: Identifies slow queries, deadlocks, and resource bottlenecks
5. **Change Tracking**: Audit trail for schema changes and configuration modifications

## PostgreSQL Log Types

### Available Log Types

PostgreSQL RDS instances support two log type exports:

1. **`postgresql`**: General database logs including:

   - Connection attempts (successful and failed)
   - Query execution details
   - Error messages and warnings
   - Deadlock information
   - Checkpoints and WAL activity
   - Slow query logs

2. **`upgrade`**: Major version upgrade logs including:
   - Pre-upgrade checks
   - Upgrade process details
   - Post-upgrade validation
   - Compatibility warnings

### Default Configuration

```hcl
enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
```

## Implementation

### Terraform Configuration

The RDS module has been updated to enable CloudWatch Logs by default:

```hcl
resource "aws_db_instance" "this" {
  # ... other configuration ...

  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports

  # ... rest of configuration ...
}
```

### Variable Definition

```hcl
variable "enabled_cloudwatch_logs_exports" {
  description = "List of log types to enable for CloudWatch export. For PostgreSQL: postgresql, upgrade"
  type        = list(string)
  default     = ["postgresql", "upgrade"]
}
```

### Usage Example

```hcl
module "rds" {
  source = "./modules/rds"

  # ... other required variables ...

  # Use default logging (both postgresql and upgrade)
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Or specify subset (not recommended)
  # enabled_cloudwatch_logs_exports = ["postgresql"]
}
```

## Log Retention and Access

### CloudWatch Log Groups

RDS automatically creates CloudWatch Log Groups with the following naming pattern:

```
/aws/rds/instance/<instance-identifier>/postgresql
/aws/rds/instance/<instance-identifier>/upgrade
```

### Recommended Retention Policy

- **Development**: 7 days minimum
- **Staging**: 30 days minimum
- **Production**: 90 days minimum (or per compliance requirements)

### IAM Permissions

To access RDS CloudWatch Logs, IAM users/roles need:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:DescribeLogStreams",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/rds/instance/*"
    }
  ]
}
```

## Performance Considerations

### Storage and Cost Impact

- **Log Volume**: Varies based on query load, typically 50-500 MB/day for moderate workloads
- **CloudWatch Costs**:
  - Ingestion: $0.50 per GB
  - Storage: $0.03 per GB/month
  - Data Transfer: Minimal (logs stay in same region)

### Performance Impact

- **Minimal overhead**: CloudWatch Logs export uses asynchronous background process
- **No query performance degradation**: Logs are exported after being written to disk
- **Network bandwidth**: Uses separate network path, doesn't affect application traffic

## Monitoring and Alerting

### Recommended CloudWatch Alarms

1. **Failed Authentication Attempts**:

   - Metric Filter: `[... , msg = "*authentication failed*"]`
   - Threshold: > 10 failures in 5 minutes

2. **Slow Queries**:

   - Metric Filter: `[... , duration > 1000]` (duration in ms)
   - Threshold: > 50 slow queries in 5 minutes

3. **Connection Errors**:

   - Metric Filter: `[... , msg = "*could not connect*"]`
   - Threshold: > 5 errors in 5 minutes

4. **Deadlocks**:
   - Metric Filter: `[... , msg = "*deadlock detected*"]`
   - Threshold: > 0 deadlocks in 5 minutes

## Security Best Practices

### Log Protection

1. **Encryption**: CloudWatch Logs are encrypted at rest by default
2. **Access Control**: Use IAM policies to restrict log access to authorized personnel
3. **Log Integrity**: CloudWatch Logs are immutable; logs cannot be altered once written
4. **Audit Trail**: Enable CloudTrail logging for API calls that access or modify logs

### Sensitive Data Handling

1. **PII Filtering**: Configure PostgreSQL to avoid logging sensitive data in queries
2. **Password Masking**: RDS automatically masks passwords in connection logs
3. **Data Classification**: Treat database logs as confidential (may contain business logic)

## Compliance Mapping

| Compliance Framework | Control ID | Requirement              | Implementation                                |
| -------------------- | ---------- | ------------------------ | --------------------------------------------- |
| CIS AWS Benchmark    | 2.3.1      | Database logging enabled | enabled_cloudwatch_logs_exports configured    |
| NIST SP 800-53 r5    | AU-2       | Audit Events             | PostgreSQL logs capture all required events   |
| NIST SP 800-53 r5    | AU-3       | Audit Record Content     | Logs include timestamp, user, action, outcome |
| OWASP ASVS 4.0.3     | V7.1.3     | Security Logging         | All security events logged to CloudWatch      |
| GDPR                 | Article 32 | Security of Processing   | Logs enable breach detection                  |

## Migration Notes

### Existing Instances

For RDS instances created before this policy:

1. **No automatic logging**: Existing instances won't have logging enabled by default
2. **Terraform update required**: Run `terraform apply` to enable logging
3. **No downtime**: Enabling logging doesn't require instance restart
4. **Immediate effect**: Logs start flowing within minutes of enabling

### Rollout Plan

1. **Test in development**: Verify logging configuration and CloudWatch integration
2. **Enable in staging**: Monitor for 48 hours, validate log volume and costs
3. **Production rollout**: Enable during maintenance window (though no restart required)
4. **Verification**: Confirm log groups created and logs flowing

## Troubleshooting

### Common Issues

**Issue**: Log groups not created  
**Solution**: Verify RDS has IAM role with CloudWatch Logs permissions (RDS manages this automatically)

**Issue**: High log volume  
**Solution**: Tune PostgreSQL logging parameters in parameter group (log_min_duration_statement, log_statement)

**Issue**: Missing logs  
**Solution**: Check RDS instance status, verify enabled_cloudwatch_logs_exports setting

## References

- [AWS RDS CloudWatch Logs Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.Concepts.PostgreSQL.html)
- [CIS AWS Foundations Benchmark v1.5.0](https://www.cisecurity.org/benchmark/amazon_web_services)
- [NIST SP 800-53 Revision 5](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf)
- [PostgreSQL Logging Documentation](https://www.postgresql.org/docs/current/runtime-config-logging.html)
- [AWS CloudWatch Logs Pricing](https://aws.amazon.com/cloudwatch/pricing/)

## Change History

| Version | Date       | Author   | Changes                                                            |
| ------- | ---------- | -------- | ------------------------------------------------------------------ |
| 1.0.0   | 2025-01-08 | AI Agent | Initial policy creation with PostgreSQL logging enabled by default |

---

**Policy Enforcement**: This policy is enforced via Terraform configuration. Manual changes to disable logging will be reverted on next deployment.
