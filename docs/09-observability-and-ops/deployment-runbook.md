# Deployment Runbook

**Status**: Active  
**Last Updated**: 2025-10-29  
**Owner**: DevOps Team  
**On-Call**: PagerDuty rotation

## SLOs & Contacts

- **SRE / On-call:** SRE Team — oncall@sre.political-sphere.example
- **Deployment owner:** product-ops@political-sphere.example
- **Security owner:** security-team@political-sphere.example
- **Primary SLOs:**
  - Availability (p99): 99.9%
  - API latency (p95): < 200ms
  - Error rate (5xx): < 1% (rolling 5m)

See `docs/09-observability-and-ops/slos-slas-and-sli-catalog.md` for the full SLO/SLI catalog and measurement details.

## Quick Reference

| Environment | URL                                  | Deployment Method           | Approval Required |
| ----------- | ------------------------------------ | --------------------------- | ----------------- |
| Development | N/A                                  | Automatic on commit         | No                |
| Staging     | https://staging.political-sphere.com | Automatic on main merge     | No                |
| Production  | https://political-sphere.com         | Canary with manual approval | Yes               |

## Pre-Deployment Checklist

### Required Checks (All Environments)

- [ ] All tests passing (unit, integration, E2E)
- [ ] Security scans passed (no Critical/High vulnerabilities)
- [ ] Accessibility tests passed (WCAG 2.2 AA+)
- [ ] Code review approved (minimum 2 reviewers)
- [ ] Import boundaries validated
- [ ] SBOM generated
- [ ] Documentation updated

### Additional Checks (Production Only)

- [ ] Change reviewed by Technical Governance Committee
- [ ] Deployment window confirmed (Mon-Fri, 09:00-17:00 UTC)
- [ ] No active incidents (check PagerDuty)
- [ ] Error budget available (check Grafana)
- [ ] Stakeholders notified
- [ ] Rollback plan documented
- [ ] On-call engineer available

## Deployment Procedures

### Staging Deployment (Automatic)

**Trigger**: Merge to `main` branch

**Process**:

1. GitHub Actions triggers `ci.yml` workflow
2. Quality gates execute:
   - Linting
   - Type checking
   - Unit tests (80%+ coverage required)
   - Integration tests
   - E2E tests
   - Accessibility tests
3. Security scans execute:
   - Gitleaks (secrets)
   - npm audit (dependencies)
   - CodeQL (SAST)
   - Semgrep (SAST)
   - Trivy (containers)
4. Build containers and generate SBOM
5. Push to ECR
6. Deploy to ECS (blue-green strategy)
7. Health checks
8. Smoke tests
9. Notify team

**Duration**: ~15-20 minutes

**Monitoring**:

- CloudWatch: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1
- Grafana: https://monitoring.political-sphere.com/d/staging
- Logs: https://logs.political-sphere.com/staging

### Production Deployment (Canary)

**Trigger**: Manual approval in GitHub Actions

**Process**:

1. Navigate to: https://github.com/PolitcalSphere/political-sphere/actions/workflows/deploy-canary.yml
2. Click "Run workflow"
3. Select `environment: production`
4. Select `deployment_type: canary`
5. Click "Run workflow"
6. Approve deployment in GitHub Environment protection
7. Monitor canary stages:

```
Stage 1: 5% traffic (5 minutes)
  ├─ Deploy new version to 5% of instances
  ├─ Monitor: Error rate, latency, health checks
  └─ Decision: Continue or rollback

Stage 2: 25% traffic (10 minutes)
  ├─ Increase to 25% of instances
  ├─ Monitor: Same metrics + business KPIs
  └─ Decision: Continue or rollback

Stage 3: 50% traffic (15 minutes)
  ├─ Increase to 50% of instances
  ├─ Monitor: Full metric suite
  └─ Decision: Continue or rollback

Stage 4: 100% traffic (Complete)
  ├─ Complete rollout
  ├─ Post-deployment validation
  └─ Success notification
```

**Duration**: ~30-45 minutes

**Automatic Rollback Triggers**:

- HTTP 5XX error rate > 1%
- P95 latency > 500ms (significant degradation)
- Health check failures
- Critical metric degradation

## Monitoring During Deployment

### Key Metrics to Watch

**API Service**:

```bash
# Error rate (should be < 1%)
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=TargetGroup,Value=api-production \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum

# Response time (P95 should be < 200ms)
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=TargetGroup,Value=api-production \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics p95

# Healthy host count (should equal desired count)
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HealthyHostCount \
  --dimensions Name=TargetGroup,Value=api-production \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average
```

**Frontend Service**:

- Page load time (should be < 2s)
- Largest Contentful Paint (should be < 2.5s)
- Cumulative Layout Shift (should be < 0.1)
- First Input Delay (should be < 100ms)

**Business Metrics**:

- User session errors (should be < 0.5%)
- Critical path completion rate (should be > 99%)
- Database connection errors (should be < 5%)

### Dashboards

**Grafana Dashboards**:

- Production Overview: https://monitoring.political-sphere.com/d/prod-overview
- Canary Deployment: https://monitoring.political-sphere.com/d/canary-deployment
- Error Budget: https://monitoring.political-sphere.com/d/error-budget

**CloudWatch Dashboards**:

- ECS Services: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=ECS-Production
- ALB Metrics: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=ALB-Production

## Rollback Procedures

### Automatic Rollback

Automatic rollback is triggered when:

1. CloudWatch alarms breach thresholds
2. Health checks fail
3. Custom validation hooks fail

**Process**:

1. CodeDeploy detects failure
2. Stops traffic shift
3. Routes 100% traffic to stable version
4. Notifies on-call engineer via PagerDuty
5. Creates incident in PagerDuty

**No action required** - system handles automatically.

### Manual Rollback

Use when:

- Issues discovered after deployment completes
- Business-critical bug identified
- Data integrity concerns
- Performance degradation not caught by alarms

**Process**:

```bash
# 1. Navigate to AWS CodeDeploy
open "https://console.aws.amazon.com/codesuite/codedeploy/deployments?region=us-east-1"

# 2. Find latest deployment
DEPLOYMENT_ID=$(aws deploy list-deployments \
  --application-name political-sphere-production \
  --deployment-group-name api \
  --max-items 1 \
  --query 'deployments[0]' \
  --output text)

# 3. Stop deployment and rollback
aws deploy stop-deployment \
  --deployment-id "$DEPLOYMENT_ID" \
  --auto-rollback-enabled

# 4. Verify rollback
aws deploy get-deployment \
  --deployment-id "$DEPLOYMENT_ID" \
  --query 'deploymentInfo.status' \
  --output text

# 5. Verify services are healthy
aws ecs describe-services \
  --cluster political-sphere-production \
  --services api frontend \
  --query 'services[*].[serviceName,runningCount,desiredCount,deployments[0].status]' \
  --output table
```

**OR use GitHub Actions**:

1. Navigate to failed deployment run
2. Click "Re-run jobs" → "Re-run failed jobs"
3. Select rollback option
4. Approve in GitHub Environment

**Duration**: 5-10 minutes

### Emergency Rollback (Fastest)

For critical production issues requiring immediate rollback:

```bash
# Direct ECS service update to previous task definition
PREVIOUS_TASK_DEF=$(aws ecs describe-services \
  --cluster political-sphere-production \
  --services api \
  --query 'services[0].deployments[1].taskDefinition' \
  --output text)

aws ecs update-service \
  --cluster political-sphere-production \
  --service api \
  --task-definition "$PREVIOUS_TASK_DEF" \
  --force-new-deployment

# Do the same for frontend
PREVIOUS_TASK_DEF=$(aws ecs describe-services \
  --cluster political-sphere-production \
  --services frontend \
  --query 'services[0].deployments[1].taskDefinition' \
  --output text)

aws ecs update-service \
  --cluster political-sphere-production \
  --service frontend \
  --task-definition "$PREVIOUS_TASK_DEF" \
  --force-new-deployment
```

**Duration**: 2-3 minutes

## Post-Deployment Validation

### Smoke Tests

Run critical path tests:

```bash
# API health check
curl -f https://api.political-sphere.com/healthz

# Frontend availability
curl -f -I https://political-sphere.com

# Database connectivity
curl -f https://api.political-sphere.com/healthz/database

# External dependencies
curl -f https://api.political-sphere.com/healthz/dependencies
```

### E2E Critical Path Tests

```bash
# Run from local machine or CI
npx playwright test --grep @critical --project production
```

### Observability Validation

```bash
# Check traces are being emitted
# Check metrics are being collected
# Verify log aggregation
./scripts/ci/otel-monitor.sh deployment <deployment-id> production completed
```

## Troubleshooting

### Deployment Stuck

**Symptoms**: Deployment not progressing, tasks not starting

**Diagnosis**:

```bash
# Check ECS service events
aws ecs describe-services \
  --cluster political-sphere-production \
  --services api \
  --query 'services[0].events[0:10]' \
  --output table

# Check task failures
aws ecs list-tasks \
  --cluster political-sphere-production \
  --service-name api \
  --desired-status STOPPED \
  --query 'taskArns[0]' \
  --output text | xargs -I {} aws ecs describe-tasks \
  --cluster political-sphere-production \
  --tasks {} \
  --query 'tasks[0].stoppedReason'
```

**Resolution**:

1. Check IAM permissions
2. Verify ECR image exists
3. Check task definition validity
4. Review security groups
5. Check ECS capacity

### High Error Rate

**Symptoms**: 5XX errors above threshold

**Diagnosis**:

```bash
# Check application logs
aws logs tail /ecs/political-sphere-api --follow --since 5m

# Check for exceptions
aws logs filter-pattern '"ERROR"' --log-group-name /ecs/political-sphere-api --since 5m
```

**Resolution**:

1. Check application logs for exceptions
2. Verify database connectivity
3. Check external API dependencies
4. Validate environment variables
5. Consider rollback if widespread

### High Latency

**Symptoms**: Response times above threshold

**Diagnosis**:

```bash
# Check database query performance
# Check external API latency
# Review CloudWatch metrics
# Check for resource saturation (CPU, memory)
```

**Resolution**:

1. Scale ECS service if needed
2. Optimize slow queries
3. Check for memory leaks
4. Review application profiling
5. Consider rollback if impacting users

### Health Check Failures

**Symptoms**: Services marked unhealthy

**Diagnosis**:

```bash
# Check health endpoint
curl -v https://api.political-sphere.com/healthz

# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn>
```

**Resolution**:

1. Verify health endpoint responds
2. Check application startup time
3. Validate health check configuration
4. Review application dependencies
5. Check for deployment issues

## Post-Deployment

### Success

1. ✅ Verify all metrics are green
2. ✅ Update deployment record in S3
3. ✅ Notify stakeholders (Slack #deployments)
4. ✅ Update status page
5. ✅ Schedule postmortem (if issues encountered)

### Failure

1. ❌ Execute rollback procedure
2. ❌ Create incident in PagerDuty
3. ❌ Notify stakeholders immediately
4. ❌ Investigate root cause
5. ❌ Schedule incident postmortem
6. ❌ Update runbook with learnings

## Emergency Contacts

- **On-Call Engineer**: PagerDuty rotation
- **DevOps Lead**: [Contact info]
- **Technical Governance**: [Contact info]
- **PagerDuty**: https://politicalsphere.pagerduty.com

## References

- [CI/CD Architecture](ci-cd-architecture.md)
- [Canary Deployment Strategy ADR](../04-architecture/decisions/006-canary-deployment-strategy.md)
- [Incident Response Plan](../../INCIDENT-RESPONSE-PLAN.md)
- [Disaster Recovery Runbook](../../DISASTER-RECOVERY-RUNBOOK.md)
- [Production Readiness Checklist](../../PRODUCTION-READINESS-CHECKLIST.md)

---

**Document Version**: 1.0.0  
**Last Tested**: 2025-10-29  
**Next Review**: 2025-11-29
