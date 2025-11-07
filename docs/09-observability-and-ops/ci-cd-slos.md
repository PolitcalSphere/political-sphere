# CI/CD Service Level Objectives (SLOs) and Service Level Indicators (SLIs)

> **Owner:** Platform Engineering Team  
> **Last Updated:** 2025-11-05  
> **Review Cadence:** Quarterly  
> **Next Review:** 2026-02-05

## Overview

This document defines the Service Level Objectives (SLOs) and Service Level Indicators (SLIs) for our CI/CD pipeline. These metrics ensure our development infrastructure supports rapid, reliable, and safe software delivery aligned with our democratic governance mission.

---

## 🎯 Service Level Objectives

### Build Performance

| Metric                      | Target       | Measurement Window | Current Status |
| --------------------------- | ------------ | ------------------ | -------------- |
| **Total CI Duration (P50)** | < 5 minutes  | Per commit         | 🟡 Tracking    |
| **Total CI Duration (P95)** | < 10 minutes | Per commit         | 🟡 Tracking    |
| **Total CI Duration (P99)** | < 15 minutes | Per commit         | 🟡 Tracking    |
| **Pre-flight Checks**       | < 2 minutes  | Per run            | ✅ Met         |
| **Lint & Type Check**       | < 3 minutes  | Per run            | 🟡 Tracking    |
| **Unit Tests (sharded)**    | < 5 minutes  | Per shard          | 🟡 Tracking    |
| **E2E Tests**               | < 10 minutes | Per run            | 🟡 Tracking    |
| **Security Scans**          | < 8 minutes  | Per run            | 🟡 Tracking    |
| **Deploy to Staging**       | < 15 minutes | Per deployment     | 🟡 Tracking    |

### Reliability

| Metric                    | Target           | Measurement Window | Current Status |
| ------------------------- | ---------------- | ------------------ | -------------- |
| **CI Success Rate**       | ≥ 95%            | Rolling 7 days     | 🟡 Tracking    |
| **Flaky Test Rate**       | < 2%             | Rolling 30 days    | 🟡 Tracking    |
| **Workflow Availability** | ≥ 99.5%          | Monthly            | 🟡 Tracking    |
| **Runner Queue Time**     | < 1 minute (P95) | Per job            | 🟡 Tracking    |
| **False Positive Rate**   | < 5%             | Per check type     | 🟡 Tracking    |

### Security

| Metric                          | Target          | Measurement Window | Current Status |
| ------------------------------- | --------------- | ------------------ | -------------- |
| **Vulnerability Scan Coverage** | 100% of PRs     | Per PR             | ✅ Met         |
| **Secret Leak Detection**       | 100% of commits | Per commit         | ✅ Met         |
| **Time to Patch Critical CVE**  | < 24 hours      | Per CVE            | 🟡 Tracking    |
| **Time to Patch High CVE**      | < 7 days        | Per CVE            | 🟡 Tracking    |
| **Security Scan Freshness**     | ≤ 7 days old    | Rolling            | ✅ Met         |

### Developer Experience

| Metric                           | Target       | Measurement Window | Current Status |
| -------------------------------- | ------------ | ------------------ | -------------- |
| **Pre-commit Hook Duration**     | < 30 seconds | Per commit         | 🟡 Tracking    |
| **Pre-push Hook Duration**       | < 2 minutes  | Per push           | 🟡 Tracking    |
| **Onboarding Time**              | < 30 minutes | Per new dev        | 🔴 Not Met     |
| **Time to First Green Build**    | < 1 hour     | Per new dev        | 🟡 Tracking    |
| **Developer Satisfaction Score** | ≥ 4.0/5.0    | Quarterly survey   | 🟡 Tracking    |

---

## 📊 Service Level Indicators (SLIs)

### Primary SLIs

#### 1. Build Success Rate

```
SLI = (Successful CI Runs / Total CI Runs) × 100
Target: ≥ 95%
```

**Measurement:**

- Track via GitHub Actions API
- Exclude user-cancelled runs
- Include only completed runs (success/failure)

**Alert Thresholds:**

- 🟡 Warning: < 97%
- 🔴 Critical: < 95%

#### 2. Build Duration (P50)

```
SLI = 50th percentile of successful CI run duration
Target: < 5 minutes
```

**Measurement:**

- Measure from workflow start to completion
- Track per workflow type (CI, security, deploy)
- Exclude queuing time

**Alert Thresholds:**

- 🟡 Warning: > 6 minutes
- 🔴 Critical: > 8 minutes

#### 3. Time to Feedback

```
SLI = Time from commit push to first CI result
Target: < 2 minutes (P95)
```

**Measurement:**

- Pre-flight + lint checks must complete
- Does not include full test suite

#### 4. Change Failure Rate

```
SLI = (Failed Deployments / Total Deployments) × 100
Target: ≤ 15%
```

**Measurement:**

- Track deployments that require rollback
- Include post-deploy validation failures

### Secondary SLIs

#### 5. Test Flakiness Rate

```
SLI = (Flaky Test Executions / Total Test Executions) × 100
Target: < 2%
```

**Definition:** A test is flaky if it fails, then passes on retry without code changes.

#### 6. Security Scan Coverage

```
SLI = (PRs with Security Scans / Total PRs) × 100
Target: 100%
```

#### 7. Dependency Freshness

```
SLI = Average age of dependencies
Target: < 90 days for non-critical, < 30 days for security patches
```

---

## 🚨 Error Budget Policy

### Error Budget Calculation

```
Error Budget = (1 - SLO) × Total Requests in Period

Example for 95% CI Success Rate over 1000 runs:
Error Budget = (1 - 0.95) × 1000 = 50 failed runs allowed
```

### Error Budget Thresholds

| Budget Remaining | Actions Required                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **> 75%**        | 🟢 **Normal Operation**<br>• No restrictions<br>• Focus on feature velocity<br>• Experiment with optimizations                                     |
| **50-75%**       | 🟡 **Caution**<br>• Review recent failures<br>• Prioritize reliability fixes<br>• Defer risky changes                                              |
| **25-50%**       | 🟠 **Warning**<br>• Freeze non-critical changes<br>• Focus on stability<br>• Daily reliability review<br>• Postmortems required for all failures   |
| **< 25%**        | 🔴 **Emergency**<br>• **Feature freeze**<br>• All hands on reliability<br>• Leadership approval for any changes<br>• Root cause analysis mandatory |

### Error Budget Policies

1. **Budget Exhausted (0% remaining):**

   - Immediate feature freeze
   - Emergency incident declared
   - Focus 100% on reliability restoration
   - Daily leadership updates

2. **Budget Recovery:**

   - Once budget recovers to >50%, resume normal operations
   - Require postmortem and action items before resuming

3. **Reporting:**
   - Weekly error budget status in team sync
   - Monthly error budget trends to leadership
   - Quarterly review of SLO targets

---

## 📈 Monitoring and Alerting

### Data Collection

**Primary Sources:**

- GitHub Actions API (workflow runs, durations, success rates)
- Custom metrics collection in workflows
- Developer feedback surveys (quarterly)

**Collection Frequency:**

- Real-time: Workflow completion events
- Hourly: Aggregated metrics
- Daily: Trend analysis
- Weekly: Error budget calculations

### Alerting Rules

```yaml
# Example alert configuration
alerts:
  - name: ci_success_rate_low
    condition: sli.build_success_rate < 95
    severity: critical
    notification: platform-engineering-oncall

  - name: build_duration_high
    condition: sli.build_duration_p50 > 6m
    severity: warning
    notification: platform-engineering-slack

  - name: error_budget_exhausted
    condition: error_budget.remaining < 25
    severity: critical
    notification: [platform-engineering-oncall, engineering-leadership]
```

### Dashboards

**Primary Dashboard:** `.github/metrics/ci-performance.md` (auto-generated)

**Sections:**

1. Current SLO compliance status
2. Error budget remaining
3. Trend charts (7d, 30d, 90d)
4. Top failure reasons
5. Slowest workflows/jobs
6. Flakiest tests

---

## 🔄 Review and Improvement Process

### Weekly Review

- Error budget status
- Recent SLO violations
- Action item progress

### Monthly Review

- Full SLI analysis
- Trend identification
- Capacity planning
- Developer feedback themes

### Quarterly Review

- SLO target evaluation
- Policy adjustments
- Benchmark against industry standards
- Strategic improvements

---

## 📚 Related Documentation

- [CI/CD Architecture](../docs/architecture/cicd-flow.md)
- [CI/CD Threat Model](../docs/security/cicd-threat-model.md)
- [Chaos Testing Runbook](../docs/runbooks/chaos-testing.md)
- [Error Budget Dashboard](./metrics/error-budget-dashboard.md)

---

## 📝 Change History

| Date       | Change                    | Approver                  |
| ---------- | ------------------------- | ------------------------- |
| 2025-11-05 | Initial SLO/SLI framework | Platform Engineering Lead |

---

**Status Legend:**

- ✅ Met: Currently meeting target
- 🟡 Tracking: Monitoring in progress, status TBD
- 🔴 Not Met: Below target, action required
