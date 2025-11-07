# ADR 0015: Deployment Strategies for Kubernetes Applications

**Status:** Accepted  
**Date:** 2025-11-07  
**Decision Makers:** DevOps Team, Platform Engineering, Technical Governance Committee  
**Tags:** deployment, kubernetes, infrastructure, reliability

## Context

Political Sphere requires reliable, zero-downtime deployments to Kubernetes clusters across multiple environments (dev, staging, production). We need to support various deployment strategies that balance speed, safety, and operational complexity while maintaining our commitment to:

- **Democratic Integrity:** Ensure voting and governance systems remain available during deployments
- **Security First:** Validate container images and manifests before deployment
- **Accessibility:** Maintain WCAG 2.2 AA compliance throughout deployment cycles
- **Observability:** Track deployment metrics and provide audit trails

The deployment action must support multiple strategies to accommodate different risk profiles:

- **Low-risk changes:** Documentation updates, configuration tweaks
- **Medium-risk changes:** Feature additions, dependency updates
- **High-risk changes:** Core voting logic, authentication systems, database migrations

## Decision

We will implement **three deployment strategies** in our GitHub Actions composite action:

### 1. Rolling Deployment (Default)

**Use Case:** Standard deployments for most application updates

**Mechanism:**

- Kubernetes-native rolling update strategy
- Gradually replaces old pods with new ones
- Maintains minimum availability threshold during rollout
- Automatic rollback on failure

**Advantages:**

- Simple, battle-tested approach
- Native Kubernetes support
- Resource-efficient (no duplicate infrastructure)
- Fast deployment time (p95 < 10 minutes)

**Disadvantages:**

- Brief mixed-version state during rollout
- Rollback requires new rollout (not instant)

**Configuration:**

```yaml
uses: ./.github/actions/deploy
with:
  deployment-strategy: rolling # Default
  timeout-minutes: 10
  enable-rollback: true
```

### 2. Blue-Green Deployment

**Use Case:** High-risk deployments requiring instant rollback capability

**Mechanism:**

- Deploy new version alongside current (green deployment)
- Verify green deployment health
- Atomically switch service selector to green
- Remove old blue deployment after verification

**Advantages:**

- Instant rollback (flip service selector back)
- Zero mixed-version traffic
- Full testing in production environment before switch
- Clear separation of old/new versions

**Disadvantages:**

- Requires 2x infrastructure during deployment
- Slightly longer deployment time (p95 < 15 minutes)
- More complex orchestration

**Configuration:**

```yaml
uses: ./.github/actions/deploy
with:
  deployment-strategy: blue-green
  timeout-minutes: 15
  enable-health-check: true
```

### 3. Canary Deployment

**Use Case:** Gradual rollout for monitoring new versions under real traffic

**Mechanism:**

- Deploy new version as canary with configurable traffic %
- Monitor canary metrics (error rate, latency, etc.)
- Manual or automated promotion to full deployment
- Automatic rollback on metric degradation

**Advantages:**

- Minimize blast radius of issues
- Real-world validation under production traffic
- Gradual confidence building
- Supports A/B testing scenarios

**Disadvantages:**

- Longest deployment time (p95 < 30 minutes)
- Requires metrics infrastructure
- Complex traffic management
- Currently requires manual promotion

**Configuration:**

```yaml
uses: ./.github/actions/deploy
with:
  deployment-strategy: canary
  canary-percentage: 10 # Start with 10% traffic
  timeout-minutes: 30
```

## Implementation Details

### Security Controls

All strategies implement:

1. **Container Image Scanning:** Trivy vulnerability scan blocks deployment on HIGH/CRITICAL CVEs
2. **SBOM Generation:** CycloneDX format for supply chain transparency
3. **Manifest Validation:** kubectl, kubeval, kube-score checks
4. **Input Validation:** Regex validation prevents injection attacks
5. **OIDC Authentication:** AWS credentials via OIDC (no long-lived secrets)
6. **Secrets Management:** AWS Secrets Manager integration

### Observability

All deployments record:

- **CloudWatch Metrics:** Status, duration, count by environment/application/strategy
- **Structured Logs:** JSON format with full context
- **Kubernetes Annotations:** Commit SHA, run ID, actor, timestamp
- **Audit Trail:** Tamper-evident deployment history

### Quality Gates

All strategies enforce:

- **Health Checks:** HTTPS endpoints with SSL verification
- **Accessibility Validation:** WCAG 2.2 AA checks for frontend deployments
- **Rollback Verification:** Confirm health after rollback completes
- **Timeout Enforcement:** Explicit timeouts on all kubectl commands

## Alternatives Considered

### Recreate Strategy

**Rejected:** Causes downtime, unacceptable for production systems

**Pros:**

- Simplest possible approach
- Ensures clean slate

**Cons:**

- Downtime violates availability SLO (99.9%)
- Poor user experience
- Not suitable for democratic platform

### Shadow Deployment

**Deferred to 2.0.0:** Requires traffic mirroring infrastructure

**Pros:**

- Test with real traffic without impacting users
- Excellent for performance validation

**Cons:**

- Complex infrastructure (service mesh required)
- Doubles backend load
- Not yet in scope

### A/B Testing with Feature Flags

**Partially Implemented:** Canary supports this, full feature flag integration planned for 1.2.0

**Pros:**

- Fine-grained control
- User-based targeting
- Runtime toggles

**Cons:**

- Requires feature flag service
- Code complexity
- Technical debt if flags not cleaned up

## Strategy Selection Matrix

| Scenario                      | Recommended Strategy | Rationale                                    |
| ----------------------------- | -------------------- | -------------------------------------------- |
| **Documentation update**      | Rolling              | Low risk, fast deployment                    |
| **UI component change**       | Rolling              | Accessibility validation sufficient          |
| **New API endpoint**          | Rolling              | Backward compatible addition                 |
| **Dependency upgrade**        | Blue-Green           | Instant rollback if issues arise             |
| **Authentication changes**    | Blue-Green           | Security-critical, zero tolerance for errors |
| **Voting system update**      | Blue-Green           | Constitutional requirement for reliability   |
| **Database schema migration** | Blue-Green           | Requires coordination with rollback plan     |
| **Machine learning model**    | Canary               | Monitor performance before full rollout      |
| **Algorithm change**          | Canary               | Gradual validation of behavior changes       |
| **Major refactor**            | Canary               | Progressive confidence building              |

## Consequences

### Positive

✅ **Flexibility:** Teams can choose appropriate strategy for risk profile  
✅ **Safety:** Blue-green provides instant rollback for critical systems  
✅ **Validation:** Canary enables real-world testing before full rollout  
✅ **Simplicity:** Rolling remains default for common cases  
✅ **Consistency:** Single action interface for all strategies  
✅ **Observability:** Unified metrics and logging across strategies

### Negative

⚠️ **Complexity:** Three strategies require documentation and training  
⚠️ **Resource Usage:** Blue-green requires 2x temporary infrastructure  
⚠️ **Manual Steps:** Canary currently requires manual promotion (automation planned)  
⚠️ **Learning Curve:** Developers must understand strategy trade-offs

### Risks and Mitigations

| Risk                               | Mitigation                                                  |
| ---------------------------------- | ----------------------------------------------------------- |
| **Wrong strategy chosen**          | Provide decision matrix and examples in documentation       |
| **Blue-green cost impact**         | Monitor CloudWatch costs, enforce timeout limits            |
| **Canary left at partial rollout** | Add automated promotion in 1.1.0, alerts for stale canaries |
| **Deployment action complexity**   | Comprehensive tests, clear error messages, runbooks         |

## Compliance Mapping

- **SEC-03:** Container vulnerability scanning (Trivy)
- **OPS-01:** Structured JSON logging
- **OPS-02:** Explicit kubectl timeouts
- **OPS-03:** Rollback verification
- **OPS-04:** CloudWatch metrics
- **QUAL-03:** Atomic blue-green switching
- **UX-01:** Accessibility validation for frontend

## Future Enhancements

### Planned for 1.1.0 (Q1 2026)

- Automated canary promotion based on metrics
- Multi-region deployment orchestration
- Cost estimation before deployment

### Planned for 1.2.0 (Q2 2026)

- Feature flag integration for canary targeting
- Advanced canary analysis (Flagger integration)
- Deployment approval workflows for production

### Planned for 2.0.0 (Q4 2026)

- Shadow deployment with traffic mirroring
- Service mesh integration (Istio)
- Multi-cloud support (Azure AKS, Google GKE)

## References

- **Kubernetes Deployment Strategies:** https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- **Google SRE Book - Canarying Releases:** https://sre.google/sre-book/release-engineering/
- **Martin Fowler - Blue Green Deployment:** https://martinfowler.com/bliki/BlueGreenDeployment.html
- **NIST SP 800-204 - Microservices Security:** https://csrc.nist.gov/publications/detail/sp/800-204/final

## Related ADRs

- ADR-0001: Kubernetes as container orchestration platform
- ADR-0008: AWS as primary cloud provider
- ADR-0012: GitHub Actions for CI/CD

## Changelog

| Version | Date       | Changes                                       |
| ------- | ---------- | --------------------------------------------- |
| 1.0     | 2025-11-07 | Initial decision documenting three strategies |

---

**Approved by:** DevOps Team, Platform Engineering  
**Review Date:** 2026-05-07 (6-month review cycle)
