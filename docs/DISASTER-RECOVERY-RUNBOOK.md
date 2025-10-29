# Disaster Recovery Runbook
**Project:** Political Sphere  
**Version:** 1.0  
**Last Updated:** October 29, 2025  
**RTO (Recovery Time Objective):** 4 hours  
**RPO (Recovery Point Objective):** 1 hour

---

## Table of Contents
1. [Emergency Contacts](#emergency-contacts)
2. [DR Scenarios](#dr-scenarios)
3. [Database Recovery](#database-recovery)
4. [Application Recovery](#application-recovery)
5. [Infrastructure Recovery](#infrastructure-recovery)
6. [Complete Region Failover](#complete-region-failover)
7. [Validation Procedures](#validation-procedures)
8. [Communication Templates](#communication-templates)

---

## Emergency Contacts

### Primary Response Team
| Role | Name | Phone | Email | Backup |
|------|------|-------|-------|--------|
| Incident Commander | TBD | TBD | TBD | TBD |
| Engineering Lead | TBD | TBD | TBD | TBD |
| Security Lead | TBD | TBD | TBD | TBD |
| Infrastructure Lead | TBD | TBD | TBD | TBD |
| Database Admin | TBD | TBD | TBD | TBD |

### External Contacts
- **AWS Support:** Premium Support Case
- **Security Vendor:** TBD
- **Legal:** TBD
- **PR/Communications:** TBD

### Escalation Chain
1. On-Call Engineer (Immediate)
2. Engineering Lead (15 minutes)
3. CTO (30 minutes)
4. CEO (1 hour for P0/P1 incidents)

---

## DR Scenarios

### Scenario 1: Database Failure (P0)
**Symptoms:**
- Database connection errors
- 500 errors from API
- High RDS CPU/memory usage
- Replication lag

**Immediate Actions:**
1. Declare incident (P0)
2. Page Database Admin
3. Check RDS console for status
4. Review CloudWatch metrics

**Recovery Path:** See [Database Recovery](#database-recovery)

---

### Scenario 2: Application Crash (P1)
**Symptoms:**
- ECS tasks failing health checks
- 503 Service Unavailable errors
- No response from API endpoints
- CloudWatch alarms firing

**Immediate Actions:**
1. Declare incident (P1)
2. Check ECS task status
3. Review application logs
4. Check recent deployments

**Recovery Path:** See [Application Recovery](#application-recovery)

---

### Scenario 3: Complete Region Outage (P0)
**Symptoms:**
- All AWS services unavailable in region
- Unable to access AWS console for region
- AWS Health Dashboard shows regional issues

**Immediate Actions:**
1. Declare incident (P0)
2. Activate full DR plan
3. Prepare for region failover
4. Contact AWS support

**Recovery Path:** See [Complete Region Failover](#complete-region-failover)

---

### Scenario 4: Data Corruption (P0)
**Symptoms:**
- Inconsistent data returned from API
- Database integrity check failures
- User reports of incorrect/missing data

**Immediate Actions:**
1. Declare incident (P0)
2. Stop all write operations immediately
3. Enable read-only mode
4. Snapshot current state

**Recovery Path:** See [Database Recovery](#database-recovery) - Point-in-Time Recovery

---

### Scenario 5: Security Breach (P0)
**Symptoms:**
- Unauthorized access detected
- Data exfiltration alerts
- Compromised credentials
- Unusual API activity

**Immediate Actions:**
1. Follow [Incident Response Plan](./INCIDENT-RESPONSE-PLAN.md)
2. Isolate affected systems
3. Preserve evidence
4. Contact security team

**Recovery Path:** Follow security incident procedures + system recovery

---

## Database Recovery

### Prerequisites
- AWS CLI configured with appropriate IAM permissions
- Access to RDS console
- Knowledge of latest backup snapshot
- Database connection strings

---

### Recovery Option 1: Automated Failover (RTO: 2-5 minutes)

For Aurora Multi-AZ clusters, automatic failover occurs when primary fails.

**Verification:**
```bash
# Check cluster status
aws rds describe-db-clusters \
  --db-cluster-identifier political-sphere-production \
  --query 'DBClusters[0].[Status,Endpoint,ReaderEndpoint]'

# Check current writer
aws rds describe-db-cluster-endpoints \
  --db-cluster-identifier political-sphere-production
```

**Application Changes:**
- No changes needed if using cluster endpoint
- If using instance endpoint, update connection string to cluster endpoint

---

### Recovery Option 2: Restore from Snapshot (RTO: 15-30 minutes)

**Step 1: Identify Latest Snapshot**
```bash
# List recent snapshots
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier political-sphere-production \
  --query 'DBClusterSnapshots[].[DBClusterSnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table | head -20

# Or list automated backups
aws rds describe-db-cluster-automated-backups \
  --db-cluster-identifier political-sphere-production
```

**Step 2: Restore Snapshot**
```bash
# Restore to new cluster
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier political-sphere-production-restored-$(date +%Y%m%d-%H%M) \
  --snapshot-identifier <snapshot-id> \
  --engine aurora-postgresql \
  --engine-version 14.7 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name political-sphere-db-subnet \
  --tags Key=Environment,Value=production Key=RestoredFrom,Value=<snapshot-id>

# Wait for cluster to be available
aws rds wait db-cluster-available \
  --db-cluster-identifier political-sphere-production-restored-<timestamp>
```

**Step 3: Create Reader Instance**
```bash
# Add reader instance
aws rds create-db-instance \
  --db-instance-identifier political-sphere-production-restored-reader-1 \
  --db-cluster-identifier political-sphere-production-restored-<timestamp> \
  --db-instance-class db.r6g.large \
  --engine aurora-postgresql
```

**Step 4: Update Application Configuration**
```bash
# Update Secrets Manager with new endpoint
NEW_ENDPOINT=$(aws rds describe-db-clusters \
  --db-cluster-identifier political-sphere-production-restored-<timestamp> \
  --query 'DBClusters[0].Endpoint' \
  --output text)

aws secretsmanager update-secret \
  --secret-id political-sphere/production/database \
  --secret-string "{\"host\":\"${NEW_ENDPOINT}\",\"port\":5432,\"database\":\"political_sphere\",\"username\":\"admin\"}"
```

**Step 5: Restart Application**
```bash
# Force new deployment to pick up new secrets
aws ecs update-service \
  --cluster political-sphere-production \
  --service political-sphere-api \
  --force-new-deployment
```

**Step 6: Verify**
- Run health checks
- Check application logs
- Verify data integrity
- Run smoke tests

---

### Recovery Option 3: Point-in-Time Recovery (RTO: 20-40 minutes)

Use when you need to recover to a specific moment before corruption/deletion.

**Step 1: Determine Recovery Point**
```bash
# Get earliest restorable time
aws rds describe-db-clusters \
  --db-cluster-identifier political-sphere-production \
  --query 'DBClusters[0].[EarliestRestorableTime,LatestRestorableTime]'
```

**Step 2: Restore to Point-in-Time**
```bash
# Restore to specific timestamp
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier political-sphere-production \
  --db-cluster-identifier political-sphere-production-pitr-$(date +%Y%m%d-%H%M) \
  --restore-to-time "2025-10-29T10:30:00Z" \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name political-sphere-db-subnet

# Or restore to latest restorable time
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier political-sphere-production \
  --db-cluster-identifier political-sphere-production-pitr-$(date +%Y%m%d-%H%M) \
  --use-latest-restorable-time \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name political-sphere-db-subnet
```

**Step 3-6:** Same as snapshot restore

---

### Database Recovery Checklist

- [ ] Incident declared
- [ ] Database admin paged
- [ ] Current state documented
- [ ] Backup identified
- [ ] Recovery option selected
- [ ] Restore initiated
- [ ] Restore completed
- [ ] Application updated
- [ ] Health checks passing
- [ ] Data integrity verified
- [ ] Performance validated
- [ ] Monitoring re-enabled
- [ ] Incident documented
- [ ] Post-mortem scheduled

---

## Application Recovery

### Recovery Option 1: Redeploy Current Version (RTO: 5-10 minutes)

**Step 1: Check Current Deployment**
```bash
# Get current task definition
aws ecs describe-services \
  --cluster political-sphere-production \
  --services political-sphere-api \
  --query 'services[0].taskDefinition'
```

**Step 2: Force Redeployment**
```bash
# Force new deployment (pulls fresh containers)
aws ecs update-service \
  --cluster political-sphere-production \
  --service political-sphere-api \
  --force-new-deployment \
  --desired-count 3

# Monitor deployment
aws ecs wait services-stable \
  --cluster political-sphere-production \
  --services political-sphere-api
```

**Step 3: Verify**
```bash
# Check task status
aws ecs describe-services \
  --cluster political-sphere-production \
  --services political-sphere-api \
  --query 'services[0].[runningCount,desiredCount]'

# Check health
curl -f https://api.political-sphere.com/health
```

---

### Recovery Option 2: Rollback to Previous Version (RTO: 5-10 minutes)

**Step 1: Find Previous Task Definition**
```bash
# List recent task definitions
aws ecs list-task-definitions \
  --family-prefix political-sphere-api \
  --sort DESC \
  --max-results 5

# Describe specific version
aws ecs describe-task-definition \
  --task-definition political-sphere-api:42
```

**Step 2: Rollback**
```bash
# Update service to previous task definition
aws ecs update-service \
  --cluster political-sphere-production \
  --service political-sphere-api \
  --task-definition political-sphere-api:42

# Wait for deployment
aws ecs wait services-stable \
  --cluster political-sphere-production \
  --services political-sphere-api
```

---

### Recovery Option 3: Blue-Green Deployment Recovery (RTO: 10-15 minutes)

**Step 1: Deploy to Green Environment**
```bash
# Create new service (green)
aws ecs create-service \
  --cluster political-sphere-production \
  --service-name political-sphere-api-green \
  --task-definition political-sphere-api:latest \
  --desired-count 3 \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:...:targetgroup/political-sphere-api-green \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}"
```

**Step 2: Validate Green Environment**
```bash
# Test green endpoint
curl -f https://api-green.political-sphere.com/health

# Run smoke tests
npm run test:smoke -- --endpoint=https://api-green.political-sphere.com
```

**Step 3: Switch Traffic**
```bash
# Update Route53 weighted routing (gradual)
# 90% blue, 10% green
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch file://switch-10-percent.json

# Monitor for 10 minutes

# 50% blue, 50% green
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch file://switch-50-percent.json

# Monitor for 10 minutes

# 100% green
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch file://switch-100-percent.json
```

**Step 4: Decommission Blue**
```bash
# Scale down blue service
aws ecs update-service \
  --cluster political-sphere-production \
  --service political-sphere-api \
  --desired-count 0

# Delete after 24 hours
aws ecs delete-service \
  --cluster political-sphere-production \
  --service political-sphere-api \
  --force
```

---

### Application Recovery Checklist

- [ ] Incident scope identified
- [ ] Recovery option selected
- [ ] Dependencies checked (database, Redis, etc.)
- [ ] Deployment initiated
- [ ] Health checks passing
- [ ] Logs checked for errors
- [ ] Performance metrics normal
- [ ] User-facing functionality verified
- [ ] Load balancer health checks green
- [ ] Monitoring alerts cleared
- [ ] Incident documented

---

## Infrastructure Recovery

### Recovery from Terraform State Corruption

**Step 1: Restore Terraform State**
```bash
# List state backups
aws s3 ls s3://political-sphere-terraform-state/state/backups/

# Download backup
aws s3 cp s3://political-sphere-terraform-state/state/backups/terraform.tfstate.<timestamp> \
  ./terraform.tfstate.backup

# Restore
aws s3 cp ./terraform.tfstate.backup \
  s3://political-sphere-terraform-state/state/terraform.tfstate
```

**Step 2: Verify State**
```bash
cd apps/infrastructure/terraform

terraform init
terraform plan

# Check for drift
terraform plan -out=tfplan
```

**Step 3: Import Missing Resources**
```bash
# If resources exist but not in state
terraform import aws_ecs_cluster.main political-sphere-production
terraform import aws_rds_cluster.main political-sphere-production
# ... etc
```

---

### Recovery from Configuration Drift

**Step 1: Detect Drift**
```bash
cd apps/infrastructure/terraform
terraform plan -detailed-exitcode

# Exit code 2 means drift detected
```

**Step 2: Review Changes**
```bash
terraform plan -out=tfplan
terraform show tfplan
```

**Step 3: Apply Corrections**
```bash
# Option A: Apply Terraform changes
terraform apply tfplan

# Option B: Import manual changes
terraform import <resource_type>.<name> <resource_id>

# Option C: Taint and recreate
terraform taint <resource>
terraform apply
```

---

## Complete Region Failover

### Assumptions
- Multi-region setup with us-east-1 (primary) and us-west-2 (DR)
- Cross-region RDS read replica
- S3 cross-region replication
- Route53 health checks

### Failover Procedure (RTO: 30-60 minutes)

**Step 1: Assess Primary Region**
```bash
# Check AWS Health Dashboard
aws health describe-events \
  --filter eventTypeCategories=issue \
  --region us-east-1

# Check service availability
aws ecs list-clusters --region us-east-1 || echo "Primary region unavailable"
```

**Step 2: Promote DR Database**
```bash
# Promote read replica to standalone cluster
aws rds promote-read-replica-db-cluster \
  --db-cluster-identifier political-sphere-production-dr \
  --region us-west-2

# Wait for promotion
aws rds wait db-cluster-available \
  --db-cluster-identifier political-sphere-production-dr \
  --region us-west-2
```

**Step 3: Deploy Application in DR Region**
```bash
# Deploy ECS services in us-west-2
cd apps/infrastructure/terraform
terraform workspace select dr

terraform apply \
  -var="region=us-west-2" \
  -var="environment=production-dr" \
  -target=module.ecs \
  -auto-approve
```

**Step 4: Update DNS**
```bash
# Failover Route53 to us-west-2
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch file://failover-to-west.json

# Verify propagation
dig api.political-sphere.com
```

**Step 5: Update Secrets**
```bash
# Point to DR database endpoint
DR_ENDPOINT=$(aws rds describe-db-clusters \
  --db-cluster-identifier political-sphere-production-dr \
  --region us-west-2 \
  --query 'DBClusters[0].Endpoint' \
  --output text)

aws secretsmanager update-secret \
  --secret-id political-sphere/production/database \
  --secret-string "{\"host\":\"${DR_ENDPOINT}\",\"port\":5432}" \
  --region us-west-2
```

**Step 6: Verify Services**
```bash
# Health checks
curl -f https://api.political-sphere.com/health

# Check ECS tasks
aws ecs describe-services \
  --cluster political-sphere-production-dr \
  --services political-sphere-api \
  --region us-west-2

# Run smoke tests
npm run test:smoke
```

**Step 7: Enable Monitoring**
```bash
# Verify CloudWatch alarms in new region
aws cloudwatch describe-alarms \
  --region us-west-2 \
  --query 'MetricAlarms[?starts_with(AlarmName, `political-sphere`)]'

# Update status page
echo "Failover to us-west-2 completed at $(date)" | \
  aws sns publish \
    --topic-arn arn:aws:sns:us-west-2:ACCOUNT:status-updates \
    --message file:///dev/stdin
```

### Failback Procedure (When primary region recovers)

**Step 1: Verify Primary Region**
```bash
# Check health
aws health describe-events --region us-east-1
aws ecs list-clusters --region us-east-1
```

**Step 2: Sync Data Back**
```bash
# Create logical backup from DR database
pg_dump -h $DR_ENDPOINT -U admin political_sphere > backup.sql

# Restore to primary (if needed)
# This step depends on your replication setup
```

**Step 3: Gradual Traffic Shift**
```bash
# Weighted routing: 90% DR, 10% primary
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch file://failback-10-percent.json

# Monitor for 30 minutes
# Then 50/50
# Then 100% primary
```

---

## Validation Procedures

### Database Validation
```bash
# Connection test
psql -h $DB_ENDPOINT -U admin -d political_sphere -c "SELECT 1"

# Row counts
psql -h $DB_ENDPOINT -U admin -d political_sphere -c "
  SELECT 
    'articles' as table_name, COUNT(*) as row_count FROM articles
  UNION ALL
  SELECT 'users', COUNT(*) FROM users
  UNION ALL
  SELECT 'comments', COUNT(*) FROM comments"

# Integrity checks
psql -h $DB_ENDPOINT -U admin -d political_sphere -c "
  SELECT * FROM pg_stat_database WHERE datname = 'political_sphere'"
```

### Application Validation
```bash
# Health endpoint
curl -f https://api.political-sphere.com/health

# Critical endpoints
curl -f https://api.political-sphere.com/api/articles
curl -f https://api.political-sphere.com/api/categories

# Performance check
time curl -f https://api.political-sphere.com/api/articles

# Load test (brief)
ab -n 100 -c 10 https://api.political-sphere.com/api/articles
```

### Frontend Validation
```bash
# Homepage loads
curl -f https://political-sphere.com/ -o /dev/null

# Critical pages
curl -f https://political-sphere.com/article/latest -o /dev/null

# Static assets
curl -f https://political-sphere.com/remoteEntry.js -o /dev/null
```

### End-to-End Validation
```bash
# Run E2E tests
npm run test:e2e:smoke

# Critical user journeys
npm run test:e2e -- --grep "Create article"
npm run test:e2e -- --grep "User login"
```

---

## Communication Templates

### Initial Notification (Within 15 minutes)

**Subject:** [P0] Production Incident - Database Unavailable

**Body:**
```
Team,

We are experiencing a production incident affecting [service/feature].

Status: Investigating
Impact: [Description of user impact]
Started: [Timestamp]
ETA: TBD

Incident Commander: [Name]
War Room: #incident-[number]

Updates will be provided every 15 minutes.

- Incident Response Team
```

### Status Update (Every 15-30 minutes)

**Subject:** [P0] Update: Production Incident

**Body:**
```
Update #[N] - [Timestamp]

Current Status: [Investigating/Identified/Recovering/Resolved]

Progress:
- [Action taken]
- [Current step]

Next Steps:
- [Planned action]

ETA: [Updated estimate]

- Incident Response Team
```

### Resolution Notice

**Subject:** [Resolved] Production Incident - Database Unavailable

**Body:**
```
Team,

The production incident has been resolved.

Incident Summary:
- Started: [Timestamp]
- Resolved: [Timestamp]
- Duration: [X hours Y minutes]
- Impact: [Description]

Root Cause: [Brief description]

Resolution:
[Steps taken]

Follow-up:
- Post-mortem scheduled for [date/time]
- Action items to prevent recurrence

Thank you to everyone who assisted in the resolution.

- Incident Response Team
```

### Customer Communication

**Subject:** Service Disruption Resolved

**Body:**
```
Dear Political Sphere Users,

We experienced a service disruption from [start time] to [end time] ([duration]).

During this time, [describe impact].

The issue has been fully resolved, and all services are operating normally.

We sincerely apologize for any inconvenience this may have caused.

If you continue to experience issues, please contact support at support@political-sphere.com.

Thank you for your patience and understanding.

- The Political Sphere Team
```

---

## Post-Recovery Actions

### Immediate (Within 24 hours)
- [ ] Document timeline of events
- [ ] Collect all logs and metrics
- [ ] Identify root cause
- [ ] List all actions taken
- [ ] Calculate actual RTO/RPO
- [ ] Notify all stakeholders of resolution

### Short-term (Within 1 week)
- [ ] Conduct post-mortem meeting
- [ ] Create action items to prevent recurrence
- [ ] Update runbooks based on learnings
- [ ] Test backup/restore procedures
- [ ] Update monitoring/alerting
- [ ] Share incident report with team

### Long-term (Within 1 month)
- [ ] Implement preventive measures
- [ ] Update DR plan
- [ ] Conduct DR drill
- [ ] Review and update RTO/RPO targets
- [ ] Train team on new procedures
- [ ] Update documentation

---

## Testing & Drills

### Quarterly DR Drill Schedule
- **Q1:** Database failover and restore
- **Q2:** Application rollback and recovery
- **Q3:** Complete region failover
- **Q4:** Full disaster scenario (unannounced)

### Drill Checklist
- [ ] Schedule drill (avoid peak hours)
- [ ] Notify team in advance (except Q4)
- [ ] Prepare drill scenario
- [ ] Document start time
- [ ] Execute recovery procedures
- [ ] Document end time
- [ ] Calculate actual RTO
- [ ] Identify gaps in procedures
- [ ] Update runbook
- [ ] Schedule follow-up training

---

## Appendix

### Required Tools
- AWS CLI (configured)
- kubectl (for EKS if applicable)
- psql (PostgreSQL client)
- curl
- jq

### Access Requirements
- AWS Console access (PowerUser or Admin)
- Production database credentials (from Secrets Manager)
- GitHub repository access (for code deployment)
- Monitoring dashboard access

### Reference Documentation
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [Incident Response Plan](./INCIDENT-RESPONSE-PLAN.md)
- [Architecture Documentation](./architecture.md)

---

**Document Owner:** Infrastructure Team  
**Review Frequency:** Quarterly  
**Last Tested:** TBD  
**Next Test:** TBD
