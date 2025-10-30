# Political Sphere CI/CD Pipeline - Comprehensive Diagram

**Last Updated**: 2025-10-29  
**Owner**: DevOps Team

## Full CI/CD Flow Diagram

```mermaid
graph TB
    subgraph "Developer Workstation"
        DEV[Developer writes code]
        COMMIT[git commit]
        PUSH[git push]
    end

    subgraph "Pre-commit Hooks (Lefthook + lint-staged)"
        LINT[ESLint + Prettier<br/>lint-staged]
        SPELL[cspell<br/>Spell Check]
        A11Y[Accessibility Check<br/>WCAG 2.2 AA+]
        BOUNDARIES[Import Boundaries<br/>Module enforcement]
        SECRETS[Secret Scan<br/>Trufflehog]
        COMMITMSG[Commitlint<br/>Conventional commits]
    end

    subgraph "GitHub Actions - Quality & Security"
        CI[CI Workflow<br/>ci.yml]
        SECURITY[Security Scan<br/>security.yml]
        GITLEAKS[GitLeaks<br/>Secret detection]
        VULN[Vulnerability Scan<br/>OWASP/Snyk]
        CODEQL[CodeQL<br/>SAST]
        SEMGREP[Semgrep<br/>SAST]
    end

    subgraph "Testing Stage"
        UNIT[Unit Tests<br/>Jest - 80%+ coverage]
        INTEGRATION[Integration Tests<br/>API contracts]
        E2E[E2E Tests<br/>Playwright]
        A11Y_CI[Accessibility Tests<br/>Automated WCAG]
        PERF[Performance Tests<br/>API benchmarks]
    end

    subgraph "Build & Artifacts"
        BUILD[Build Applications<br/>Nx build]
        DOCKER[Docker Build<br/>Multi-arch images]
        SBOM[Generate SBOM<br/>CycloneDX]
        SIGN[Sign Images<br/>Cosign/Sigstore]
    end

    subgraph "Pre-deployment Validation"
        INCIDENT_CHECK[Check Active Incidents<br/>PagerDuty]
        ERROR_BUDGET[Verify Error Budget<br/>Not exhausted]
        DEPLOY_WINDOW[Check Deploy Window<br/>Business hours]
        APPROVAL[Manual Approval<br/>Production only]
    end

    subgraph "Deployment Strategies"
        CANARY[Canary Deployment<br/>Progressive rollout]
        BLUE_GREEN[Blue-Green<br/>Zero downtime]
        IMMEDIATE[Immediate Deploy<br/>Staging only]
    end

    subgraph "Canary Stages"
        DEPLOY_5[Deploy 5%<br/>Monitor 10 min]
        DEPLOY_25[Deploy 25%<br/>Monitor 15 min]
        DEPLOY_50[Deploy 50%<br/>Monitor 20 min]
        DEPLOY_100[Deploy 100%<br/>Full traffic]
    end

    subgraph "Health Checks & Validation"
        SMOKE[Smoke Tests<br/>Critical paths]
        HEALTH[Health Checks<br/>API endpoints]
        METRICS[Metrics Validation<br/>Error rates, latency]
        E2E_PROD[E2E Critical Path<br/>Production validation]
    end

    subgraph "Observability (OpenTelemetry)"
        TRACES[Distributed Traces<br/>Jaeger/Tempo]
        METRICS_OBS[Metrics<br/>Prometheus/Grafana]
        LOGS[Structured Logs<br/>Loki/CloudWatch]
        ALERTS[Alerting<br/>PagerDuty/Slack]
    end

    subgraph "Rollback & Recovery"
        AUTO_ROLLBACK[Automatic Rollback<br/>On failure]
        MANUAL_ROLLBACK[Manual Rollback<br/>Emergency]
        POSTMORTEM[Incident Postmortem<br/>Blameless review]
    end

    subgraph "Post-deployment"
        MONITOR[Monitor SLIs/SLOs<br/>99.9% uptime]
        REPORT[Deployment Report<br/>Audit trail]
        NOTIFY[Notifications<br/>Slack/Email]
    end

    %% Flow connections
    DEV --> COMMIT
    COMMIT --> LINT
    COMMIT --> SPELL
    COMMIT --> A11Y
    COMMIT --> BOUNDARIES
    COMMIT --> SECRETS
    COMMIT --> COMMITMSG
    
    LINT --> PUSH
    SPELL --> PUSH
    A11Y --> PUSH
    BOUNDARIES --> PUSH
    SECRETS --> PUSH
    COMMITMSG --> PUSH

    PUSH --> CI
    PUSH --> SECURITY
    PUSH --> GITLEAKS
    PUSH --> VULN
    PUSH --> CODEQL
    PUSH --> SEMGREP

    CI --> UNIT
    CI --> INTEGRATION
    CI --> E2E
    CI --> A11Y_CI
    CI --> PERF

    UNIT --> BUILD
    INTEGRATION --> BUILD
    E2E --> BUILD
    A11Y_CI --> BUILD
    PERF --> BUILD

    BUILD --> DOCKER
    DOCKER --> SBOM
    SBOM --> SIGN

    SIGN --> INCIDENT_CHECK
    INCIDENT_CHECK --> ERROR_BUDGET
    ERROR_BUDGET --> DEPLOY_WINDOW
    DEPLOY_WINDOW --> APPROVAL

    APPROVAL --> CANARY
    APPROVAL --> BLUE_GREEN
    APPROVAL --> IMMEDIATE

    CANARY --> DEPLOY_5
    DEPLOY_5 --> HEALTH
    HEALTH --> DEPLOY_25
    DEPLOY_25 --> SMOKE
    SMOKE --> DEPLOY_50
    DEPLOY_50 --> METRICS
    METRICS --> DEPLOY_100

    DEPLOY_100 --> E2E_PROD
    BLUE_GREEN --> E2E_PROD
    IMMEDIATE --> E2E_PROD

    E2E_PROD --> MONITOR

    HEALTH -.Failure.-> AUTO_ROLLBACK
    SMOKE -.Failure.-> AUTO_ROLLBACK
    METRICS -.Failure.-> AUTO_ROLLBACK
    E2E_PROD -.Failure.-> AUTO_ROLLBACK

    AUTO_ROLLBACK --> POSTMORTEM
    MANUAL_ROLLBACK --> POSTMORTEM

    MONITOR --> TRACES
    MONITOR --> METRICS_OBS
    MONITOR --> LOGS
    MONITOR --> ALERTS

    MONITOR --> REPORT
    REPORT --> NOTIFY

    %% Styling
    classDef precommit fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef security fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    classDef testing fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef deployment fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef observability fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef rollback fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class LINT,SPELL,A11Y,BOUNDARIES,SECRETS,COMMITMSG precommit
    class SECURITY,GITLEAKS,VULN,CODEQL,SEMGREP security
    class UNIT,INTEGRATION,E2E,A11Y_CI,PERF testing
    class CANARY,BLUE_GREEN,IMMEDIATE,DEPLOY_5,DEPLOY_25,DEPLOY_50,DEPLOY_100 deployment
    class TRACES,METRICS_OBS,LOGS,ALERTS observability
    class AUTO_ROLLBACK,MANUAL_ROLLBACK,POSTMORTEM rollback
```

## Pipeline Stage Breakdown

### 🔹 Stage 1: Pre-commit Hooks (Local)
**Duration**: ~10-30 seconds  
**Tools**: Lefthook, lint-staged

| Check | Tool | Purpose |
|-------|------|---------|
| Linting & Formatting | ESLint + Prettier | Code quality & consistency |
| Spell Check | cspell | Prevent typos in code/docs |
| Accessibility | a11y-check.sh | WCAG 2.2 AA+ compliance |
| Import Boundaries | check-import-boundaries.js | Module isolation |
| Secret Scanning | Trufflehog | Prevent credential leaks |
| Commit Messages | commitlint | Conventional commits |

**Success Criteria**: All checks pass, files auto-fixed where possible

---

### 🔹 Stage 2: Quality & Security (CI - Parallel)
**Duration**: ~5-10 minutes  
**Workflows**: ci.yml, security.yml, gitleaks.yml, vulnerability-scan.yml, semgrep.yml, codeql.yml

| Check | Purpose | Failure Action |
|-------|---------|----------------|
| Linting | ESLint, Biome | Block merge |
| Type Check | TypeScript | Block merge |
| Import Boundaries | Nx enforce boundaries | Block merge |
| Secret Detection | GitLeaks | Block merge (Critical) |
| Dependency Scan | npm audit, Snyk, OWASP | Block if Critical/High |
| SAST | CodeQL, Semgrep | Block if Critical |
| Container Scan | Trivy | Block if Critical vulnerabilities |
| License Check | License compliance | Block if incompatible |

**Success Criteria**: No critical/high vulnerabilities, all quality checks pass

---

### 🔹 Stage 3: Testing (CI - Parallel)
**Duration**: ~10-15 minutes  
**Workflows**: ci.yml, integration.yml, e2e.yml

| Test Type | Tool | Coverage Target | Failure Action |
|-----------|------|-----------------|----------------|
| Unit Tests | Jest | 80%+ | Block merge |
| Integration Tests | Node.js test runner | API contracts pass | Block merge |
| E2E Tests | Playwright | Critical journeys pass | Block merge |
| Accessibility Tests | axe-core, pa11y | WCAG 2.2 AA+ | Block merge |
| Contract Tests | Pact | Service compatibility | Block merge |
| Performance Tests | Custom benchmarks | P95 < 500ms | Warn, don't block |

**Success Criteria**: All tests pass, coverage meets threshold

---

### 🔹 Stage 4: Build & Artifacts
**Duration**: ~5-10 minutes  
**Workflows**: ci.yml, deploy.yml

**Outputs**:
- 📦 Docker images (amd64 + arm64)
- 📦 SBOM (Software Bill of Materials - CycloneDX format)
- 📦 Test reports (JUnit XML, HTML)
- 📦 Coverage reports (LCOV, HTML)
- 📦 Accessibility audit (JSON)
- 📦 Signed artifacts (Cosign/Sigstore)

**Success Criteria**: Images built, scanned, signed, pushed to registry

---

### 🔹 Stage 5: Pre-deployment Validation
**Duration**: ~2-5 minutes  
**Workflow**: deploy-canary.yml

| Check | Purpose | Action if Failed |
|-------|---------|------------------|
| Active Incidents | PagerDuty check | Block deployment |
| Error Budget | SLO budget remaining | Block if exhausted |
| Deployment Window | Business hours check | Block off-hours (prod) |
| Manual Approval | Human gate (prod only) | Wait for approval |

**Success Criteria**: No blockers, approval granted (if required)

---

### 🔹 Stage 6: Canary Deployment (Progressive Rollout)
**Duration**: ~45-60 minutes  
**Workflow**: deploy-canary.yml

| Phase | Traffic % | Duration | Validation |
|-------|-----------|----------|------------|
| Initial | 5% | 10 min | Health checks + basic metrics |
| Expand | 25% | 15 min | Smoke tests + error rate |
| Majority | 50% | 20 min | Full metrics validation |
| Complete | 100% | - | E2E critical path tests |

**At each phase**:
1. Deploy to subset of pods/instances
2. Wait for stabilization period
3. Run health checks
4. Validate metrics (error rate, latency, saturation)
5. If validation fails → **Automatic rollback**
6. If validation passes → Proceed to next phase

**Success Criteria**: All phases complete, metrics within SLOs

---

### 🔹 Stage 7: Post-deployment Validation
**Duration**: ~10-15 minutes  
**Workflow**: deploy-canary.yml, e2e.yml

| Check | Purpose | Failure Action |
|-------|---------|----------------|
| Smoke Tests | Basic functionality | Rollback |
| Health Checks | Service availability | Rollback |
| E2E Critical Path | User journeys work | Rollback |
| Metrics Validation | Error rates, latency, throughput | Rollback if degraded |

**Success Criteria**: All services healthy, metrics within SLOs

---

### 🔹 Stage 8: Observability & Monitoring (Continuous)
**Duration**: Continuous  
**Workflow**: monitoring.yml

**OpenTelemetry Integration**:
- **Traces**: Distributed tracing (Jaeger/Tempo)
- **Metrics**: Prometheus → Grafana dashboards
- **Logs**: Structured JSON logs (Loki/CloudWatch)
- **Alerts**: PagerDuty, Slack notifications

**SLIs/SLOs**:
- Availability: 99.9%+ uptime
- Latency: P50 < 200ms, P95 < 500ms, P99 < 1s
- Error Rate: < 0.1%
- Saturation: CPU < 70%, Memory < 80%

**Success Criteria**: Metrics within SLOs, no critical alerts

---

### 🔹 Stage 9: Rollback (If Needed)
**Duration**: ~5-10 minutes  

**Automatic Rollback Triggers**:
- Health check failures
- Error rate > 1%
- Latency P95 > 2x baseline
- E2E test failures
- Manual trigger

**Rollback Process**:
1. Stop canary deployment
2. Route 100% traffic to previous version
3. Verify metrics recover
4. Create incident ticket
5. Notify team

**Post-rollback**:
- Conduct blameless postmortem
- Identify root cause
- Create action items
- Update runbooks

---

## Key Metrics & SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Deployment Frequency** | Multiple per day (staging) | GitHub Actions runs |
| **Lead Time** | < 30 min (commit to staging) | Git commit → deployed |
| **Change Failure Rate** | < 5% | Rollbacks / Total deployments |
| **MTTR** | < 1 hour | Incident detection → resolution |
| **Test Coverage** | 80%+ | Jest coverage reports |
| **Build Time** | < 15 min | CI workflow duration |
| **Deployment Time** | < 60 min (canary) | Deploy workflow duration |

---

## Failure Handling & Escalation

### Critical Issues (Immediate Block)
- Security vulnerabilities (Critical/High severity)
- Failed accessibility tests
- Secret leaks detected
- Critical test failures
- Build failures

**Action**: Block merge/deployment, alert team, require fix

### High Issues (Block within 7 days)
- High-severity vulnerabilities
- Moderate test failures
- Performance degradation

**Action**: Create ticket, schedule fix, monitor

### Medium/Low Issues (Track & Plan)
- Medium/Low vulnerabilities
- Non-critical warnings
- Tech debt items

**Action**: Add to backlog, prioritize in sprint planning

---

## Compliance & Audit Trail

All deployments tracked with:
- ✅ Deployment ID (unique identifier)
- ✅ Git SHA (source code version)
- ✅ Artifact hashes (SBOM, container images)
- ✅ Approval records (who approved, when)
- ✅ Test results (pass/fail, coverage)
- ✅ Security scan results (vulnerabilities found/fixed)
- ✅ Deployment timeline (start, phases, completion)
- ✅ Metrics snapshots (before/after comparison)

**Retention**: 90 days for staging, 1 year for production

---

## Related Documentation

- [CI/CD Architecture](./ci-cd-architecture.md)
- [Deployment Runbook](../09-observability-and-ops/deployment-runbook.md)
- [Canary Deployment Strategy ADR](../04-architecture/decisions/006-canary-deployment-strategy.md)
- [Security Scanning Guide](../06-security-and-risk/security-scanning.md)
- [Incident Response Plan](../../INCIDENT-RESPONSE-PLAN.md)
- [Disaster Recovery Runbook](../../DISASTER-RECOVERY-RUNBOOK.md)

---

## Emergency Contacts

- **DevOps On-call**: PagerDuty escalation
- **Security Team**: security@politicalsphere.com
- **Platform Lead**: platform-lead@politicalsphere.com

---

**Document Control**  
**Version**: 1.0  
**Classification**: Internal  
**Review Date**: 2026-01-29
