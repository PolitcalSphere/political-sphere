# 005. Multi-Layer Security Scanning

Date: 2025-11-05  
Status: Accepted  
Deciders: Security Team, Platform Engineering Team  
Technical Story: Defense-in-depth security strategy for CI/CD

## Context and Problem Statement

As a democratic governance platform, we must maintain the highest security standards. A single security tool may miss vulnerabilities due to different scanning techniques, rule sets, and focus areas. We need a comprehensive, multi-layered security scanning approach that catches vulnerabilities early without creating excessive false positives or slowing down development.

Key question: How do we implement comprehensive security scanning that is both thorough and maintainable?

## Decision Drivers

- **Coverage**: Detect multiple vulnerability types (code, dependencies, containers, secrets)
- **Defense in Depth**: Multiple tools increase detection probability
- **Speed**: Scans must complete within CI time budgets
- **False Positives**: Minimize noise to maintain developer trust
- **Cost**: Balance free/paid tools sustainably
- **Maintainability**: Easy to update rules and manage findings
- **Compliance**: Support audit and compliance requirements
- **Developer Experience**: Clear, actionable security feedback

## Considered Options

- **Option 1**: Multi-layer approach (TruffleHog + Semgrep + Trivy + OWASP + Snyk + npm audit)
- **Option 2**: Single commercial solution (e.g., Snyk only, Veracode only)
- **Option 3**: Minimal approach (npm audit + Dependabot only)
- **Option 4**: GitHub-native only (Code Scanning + Dependabot + Secret Scanning)

## Decision Outcome

Chosen option: "Multi-layer approach with 6 complementary tools", because it provides defense-in-depth while balancing coverage, cost, and developer experience.

### Security Layer Stack

| Layer            | Tool                   | Purpose                                 | Schedule          |
| ---------------- | ---------------------- | --------------------------------------- | ----------------- |
| **Secrets**      | TruffleHog             | Secret leak detection                   | Every commit      |
| **Code**         | Semgrep                | Static analysis security testing (SAST) | Every PR          |
| **Dependencies** | npm audit              | Known vulnerabilities in npm packages   | Every PR + Weekly |
| **Dependencies** | Snyk                   | Advanced vulnerability detection        | Every PR + Weekly |
| **Dependencies** | OWASP Dependency Check | CVE database scanning                   | Weekly            |
| **Containers**   | Trivy                  | Container image scanning                | Every build       |

### Positive Consequences

- **Comprehensive Coverage**: Multiple scanning techniques catch more issues
- **Redundancy**: If one tool misses something, others may catch it
- **Specialization**: Each tool optimized for specific vulnerability types
- **Fast Feedback**: Critical scans (secrets, SAST) run on every commit
- **Cost Effective**: Mix of free open-source and paid tools
- **Audit Trail**: Multiple tools provide stronger compliance evidence
- **No Single Point of Failure**: Not dependent on one vendor
- **Best-of-Breed**: Use the best tool for each job

### Negative Consequences

- **Complexity**: Six tools to maintain and configure
- **Alert Fatigue**: Potential for overlapping alerts
- **Integration Work**: Each tool needs CI integration
- **Cost**: Snyk and OWASP have potential costs at scale
- **Slow Scans**: Running all scans can take 5-10 minutes
- **Configuration Drift**: Multiple tools mean multiple config files

## Pros and Cons of the Options

### Multi-layer Approach (Chosen)

- Good, because catches more vulnerabilities through diverse techniques
- Good, because redundancy provides higher confidence
- Good, because specialized tools excel at specific tasks
- Good, because not locked into single vendor
- Good, because provides strong audit evidence
- Good, because free tier covers most needs
- Bad, because complex to maintain
- Bad, because potential alert duplication
- Bad, because longer total scan time

### Single Commercial Solution

- Good, because simpler to manage (one vendor)
- Good, because unified dashboard and reporting
- Good, because single support contact
- Bad, because potential blind spots from single approach
- Bad, because vendor lock-in
- Bad, because costly at scale
- Bad, because single point of failure

### Minimal Approach

- Good, because simple and fast
- Good, because free
- Good, because low maintenance
- Bad, because insufficient coverage for democratic platform
- Bad, because misses many vulnerability types
- Bad, because compliance gaps
- Bad, because false sense of security

### GitHub-Native Only

- Good, because excellent GitHub integration
- Good, because zero configuration needed
- Good, because free for public repos
- Bad, because limited to GitHub's scanning capabilities
- Bad, because may miss vulnerabilities other tools catch
- Bad, because less control over scanning rules

## Implementation Notes

### Scan Execution Strategy

#### Pre-commit (Local)

```yaml
# Lefthook configuration
secrets:
  run: git diff --staged | docker run trufflesecurity/trufflehog:latest stdin
```

#### Pull Request (CI)

- TruffleHog: Scan diff against main
- Semgrep: Security rules only
- npm audit: Production dependencies
- Snyk: All dependencies

#### Weekly Scheduled

- OWASP Dependency Check: Full CVE scan
- Trivy: All container images
- Full npm audit: Including dev dependencies

### Alert Management

1. **Deduplication**: Scripts to merge alerts from multiple tools
2. **Prioritization**: Critical → High → Medium → Low
3. **False Positive Tracking**: Suppress known false positives
4. **SLA Tracking**: Time to remediation by severity

### Tool-Specific Configuration

**TruffleHog**

```yaml
# Only verified secrets to reduce false positives
extra_args: --only-verified
```

**Semgrep**

```yaml
# Use security-focused rulesets
config: p/security-audit p/owasp-top-ten
```

**Trivy**

```yaml
# Fail on HIGH and CRITICAL
severity: HIGH,CRITICAL
format: sarif # Upload to GitHub Security
```

## Monitoring and Success Criteria

- ✅ 100% of commits scanned for secrets
- ✅ 100% of PRs have security scans
- ✅ Weekly full vulnerability scan completion rate ≥ 95%
- 🟡 Mean time to remediate CRITICAL: < 24 hours
- 🟡 Mean time to remediate HIGH: < 7 days
- ✅ Zero production security incidents from missed vulnerabilities
- 🟡 False positive rate < 10%

### Current Performance

- **Scan Coverage**: 100% of commits/PRs
- **Average Scan Time**: 8 minutes total
- **Critical Findings**: 0 open (30d average)
- **High Findings**: 2 open (30d average)
- **False Positive Rate**: ~8%

## Cost Analysis

| Tool       | Tier | Monthly Cost | Notes                |
| ---------- | ---- | ------------ | -------------------- |
| TruffleHog | Free | $0           | Open source          |
| Semgrep    | Free | $0           | Community rules      |
| npm audit  | Free | $0           | Built-in             |
| Snyk       | Free | $0           | Free for open source |
| OWASP      | Free | $0           | Open source          |
| Trivy      | Free | $0           | Open source          |
| **Total**  |      | **$0**       | Sustainable          |

## Links

- Related to [ADR-001](001-github-actions-as-ci-platform.md) - CI platform
- Related to [ADR-006](006-oidc-for-cloud-authentication.md) - Authentication security

## Review Schedule

Next review: 2026-02-05 (Quarterly)

**Review Triggers:**

- New high-impact security tool available
- Multiple vulnerabilities missed by current stack
- Scan time exceeds 15 minutes (P95)
- False positive rate exceeds 15%
- Cost exceeds $500/month
