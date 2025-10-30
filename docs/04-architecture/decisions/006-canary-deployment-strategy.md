# Canary Deployment Strategy

**Context**: Need to implement progressive delivery with canary deployments for production releases

**Date**: 2025-10-29

**Status**: Proposed

**Decision Makers**: Technical Governance Committee, DevOps Team

## Context and Problem Statement

Current production deployments use a basic blue-green strategy with full traffic cutover. This approach:
- Carries risk of immediate widespread impact from bugs
- Provides limited ability to measure impact before full rollout
- Lacks automated rollback based on metrics
- Doesn't support A/B testing or gradual feature rollouts

We need a progressive delivery mechanism that:
1. Gradually increases traffic to new versions
2. Monitors key metrics during rollout
3. Automatically rolls back on degradation
4. Supports feature flag integration
5. Maintains political neutrality (no algorithmic manipulation)

## Decision Drivers

- **Risk Mitigation**: Limit blast radius of deployment failures
- **Observability**: Measure real-world impact before full rollout
- **Speed**: Enable faster deployment cycles with safety
- **Compliance**: Maintain audit trails for regulatory requirements
- **Democratic Principles**: Ensure no algorithmic bias in rollout selection

## Considered Options

### Option 1: AWS App Mesh with ECS
**Pros**:
- Native AWS integration
- Automatic traffic splitting
- Deep integration with CloudWatch metrics
- Supports weighted routing

**Cons**:
- Vendor lock-in
- Complex configuration
- Limited observability without additional tooling

### Option 2: Flagger + Kubernetes
**Pros**:
- Open source, vendor-neutral
- Rich observability integration (Prometheus, Grafana)
- Automated rollback policies
- GitOps-friendly

**Cons**:
- Requires Kubernetes migration
- Additional infrastructure complexity
- Learning curve for team

### Option 3: Custom Solution with Feature Flags + ALB Weighted Targets
**Pros**:
- Maximum control and flexibility
- Works with existing ECS infrastructure
- Can leverage existing feature flag system
- Lower operational complexity

**Cons**:
- Custom code to maintain
- Manual metric monitoring integration
- Less battle-tested than dedicated tools

### Option 4: AWS CodeDeploy with Lambda Hooks
**Pros**:
- Managed service (reduced ops burden)
- Native ECS integration
- CloudWatch alarms for automatic rollback
- Predefined traffic shifting patterns

**Cons**:
- Limited customization
- Coarser traffic control
- Lambda overhead for validation hooks

## Decision Outcome

**Chosen option**: **Option 4 (AWS CodeDeploy) with progressive enhancement toward Option 2 (Flagger)**

### Rationale

1. **Immediate Implementation**: CodeDeploy provides immediate value with minimal changes
2. **Managed Service**: Reduces operational burden on small team
3. **Proven Reliability**: AWS-managed, battle-tested
4. **Migration Path**: Positions us for future Kubernetes migration
5. **Cost-Effective**: No additional infrastructure costs

### Implementation Strategy

**Phase 1: AWS CodeDeploy Integration (Q4 2025)**
- Implement CodeDeploy for ECS services
- Configure traffic shifting: 5% → 25% → 50% → 100%
- Set up CloudWatch alarms for automatic rollback
- Define deployment configurations per environment

**Phase 2: Enhanced Observability (Q1 2026)**
- Integrate OpenTelemetry traces for deployment tracking
- Create Grafana dashboards for canary metrics
- Implement custom metric collection (business KPIs)
- Add Slack/PagerDuty alerting

**Phase 3: Feature Flag Integration (Q2 2026)**
- Integrate with feature flag system (LaunchDarkly or custom)
- Enable progressive feature rollouts independent of deployments
- Implement targeting rules (avoid algorithmic bias)

**Phase 4: Kubernetes Migration (2026)**
- Evaluate Kubernetes adoption
- If adopted, migrate to Flagger for advanced progressive delivery
- Maintain learnings and policies from CodeDeploy implementation

## Technical Design

### Traffic Shifting Pattern

```
Time    Canary Traffic  Stable Traffic  Validation
-----------------------------------------------------
T+0     5%              95%             5 minutes
T+5     25%             75%             10 minutes
T+15    50%             50%             15 minutes
T+30    100%            0%              Complete
```

### Automatic Rollback Triggers

1. **HTTP Error Rate**: > 1% errors
2. **Response Time**: P95 > 1000ms (double baseline)
3. **Custom Metrics**:
   - User session errors > 0.5%
   - Critical path failures > 0.1%
   - Database connection errors > 5%

### CloudWatch Alarms

```yaml
alarms:
  - name: HighErrorRate
    metric: HTTPCode_Target_5XX_Count
    threshold: 1%
    evaluation_periods: 2
    datapoints_to_alarm: 2
    
  - name: HighLatency
    metric: TargetResponseTime
    threshold: 1000ms
    statistic: p95
    evaluation_periods: 3
    
  - name: HealthCheckFailures
    metric: UnHealthyHostCount
    threshold: 1
    evaluation_periods: 2
```

### Deployment Configuration

```yaml
# CodeDeploy AppSpec
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: <TASK_DEFINITION>
        LoadBalancerInfo:
          ContainerName: "api"
          ContainerPort: 4000
        PlatformVersion: "LATEST"

Hooks:
  - BeforeInstall: "LambdaFunctionToValidateBeforeTrafficShift"
  - AfterAllowTestTraffic: "LambdaFunctionToValidateAfterTestTraffic"
  - BeforeAllowTraffic: "LambdaFunctionToValidateBefore100PercentTraffic"
  - AfterAllowTraffic: "LambdaFunctionToValidateServiceAfterTraffic"
```

### Lambda Validation Hooks

```typescript
// Pre-traffic validation hook
export async function validateDeployment(event: CodeDeployEvent): Promise<void> {
  const metrics = await fetchMetrics({
    timeRange: '5m',
    metrics: ['error_rate', 'latency_p95', 'health_checks']
  });
  
  // Check error rate
  if (metrics.error_rate > 0.01) {
    throw new Error(`Error rate ${metrics.error_rate} exceeds threshold`);
  }
  
  // Check latency
  if (metrics.latency_p95 > 1000) {
    throw new Error(`Latency ${metrics.latency_p95}ms exceeds threshold`);
  }
  
  // Check health
  if (metrics.health_checks < 0.95) {
    throw new Error(`Health checks ${metrics.health_checks} below threshold`);
  }
  
  // Record deployment event
  await recordDeploymentMetric({
    deployment_id: event.deploymentId,
    status: 'validation_passed',
    metrics
  });
}
```

## Consequences

### Positive

- ✅ Reduced blast radius of deployment failures
- ✅ Automated rollback reduces MTTR
- ✅ Increased confidence in production deployments
- ✅ Better observability of deployment impact
- ✅ Enables faster iteration with safety
- ✅ Compliance-friendly audit trails

### Negative

- ⚠️ Slightly longer deployment times (5-30 minutes for full rollout)
- ⚠️ Additional complexity in deployment pipeline
- ⚠️ Requires CloudWatch alarm configuration and maintenance
- ⚠️ Lambda functions add operational overhead
- ⚠️ Need to monitor costs (Lambda invocations, CloudWatch alarms)

### Neutral

- ℹ️ Team needs training on CodeDeploy concepts
- ℹ️ Requires documentation updates
- ℹ️ Runbook creation for manual interventions

## Compliance Considerations

### Political Neutrality
- Traffic splitting is **random and uniform** (no algorithmic targeting)
- No user profiling or demographic targeting
- Canary selection based purely on infrastructure routing
- Audit logs for all deployment decisions

### Data Protection
- No PII used in deployment decisions
- Metrics aggregated and anonymized
- Audit logs comply with GDPR retention policies

### Auditability
- Full deployment history retained (90 days)
- Tamper-evident logs for compliance
- Rollback reasons documented automatically

## Implementation Checklist

**Infrastructure**:
- [ ] Create CodeDeploy application and deployment groups
- [ ] Configure ALB target groups for blue/green
- [ ] Set up IAM roles for CodeDeploy
- [ ] Create Lambda functions for validation hooks
- [ ] Configure CloudWatch alarms with appropriate thresholds

**Pipeline Integration**:
- [ ] Update `deploy.yml` workflow to use CodeDeploy
- [ ] Add deployment configuration files to repository
- [ ] Implement pre-deployment validation scripts
- [ ] Add post-deployment smoke tests

**Observability**:
- [ ] Create Grafana dashboards for canary metrics
- [ ] Set up alerting (Slack, PagerDuty)
- [ ] Implement custom metric collection
- [ ] Configure trace propagation for deployments

**Documentation**:
- [ ] Update deployment runbook
- [ ] Create troubleshooting guide
- [ ] Document rollback procedures
- [ ] Add training materials for team

**Testing**:
- [ ] Test canary deployment in staging
- [ ] Validate automatic rollback triggers
- [ ] Conduct failure scenario testing
- [ ] Performance test with traffic splitting

## Monitoring and Review

- **Success Metrics**:
  - Deployment success rate > 98%
  - Automatic rollback detects failures < 5 minutes
  - MTTR for failed deployments < 10 minutes
  - Zero undetected production issues

- **Review Schedule**: Monthly for first 3 months, then quarterly

- **Adjustment Triggers**:
  - 3+ automatic rollbacks in a week
  - False positive rollbacks > 10%
  - Deployment time exceeds 45 minutes

## References

- [AWS CodeDeploy ECS Blue/Green Deployments](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-create-ecs-blue-green.html)
- [Progressive Delivery Best Practices](https://www.weave.works/blog/progressive-delivery)
- [Deployment Runbook](../../09-observability-and-ops/deployment-runbook.md)
- [CI/CD Architecture](./ci-cd-architecture.md)

---

**Approved by**: [Pending]  
**Implementation Start**: 2025-11-01  
**Target Completion**: 2025-12-31
