# CI/CD Best Practices Guide

**Status**: Active  
**Last Updated**: 2025-10-29  
**Owner**: DevOps Team  
**Review Cycle**: Quarterly

## Table of Contents

1. [Core Principles](#core-principles)
2. [Workflow Design](#workflow-design)
3. [Security Best Practices](#security-best-practices)
4. [Quality Gates](#quality-gates)
5. [Performance Optimization](#performance-optimization)
6. [Observability](#observability)
7. [Error Handling](#error-handling)
8. [Common Pitfalls](#common-pitfalls)

## Core Principles

### 1. Quality is Architectural

**DO**:
- ✅ Design quality gates BEFORE implementation
- ✅ Include error handling in initial design
- ✅ Plan observability from the start
- ✅ Consider performance early
- ✅ Make quality gates blocking (fail the build)

**DON'T**:
- ❌ Add tests as an afterthought
- ❌ Skip quality gates in development
- ❌ Treat security as a final step
- ❌ Ignore accessibility until production

### 2. Shift Left on Security

**DO**:
- ✅ Scan for secrets on every commit (Gitleaks)
- ✅ Run SAST early in the pipeline (CodeQL, Semgrep)
- ✅ Block commits with Critical/High vulnerabilities
- ✅ Generate SBOM for every build
- ✅ Use OIDC for cloud authentication (no long-lived secrets)

**DON'T**:
- ❌ Store secrets in code or config files
- ❌ Skip security scans in development branches
- ❌ Ignore Medium/Low vulnerabilities indefinitely
- ❌ Use long-lived API keys or tokens

### 3. Progressive Delivery

**DO**:
- ✅ Use canary deployments for production
- ✅ Monitor metrics during rollout
- ✅ Automate rollback on failures
- ✅ Implement health checks at every stage
- ✅ Use feature flags for controlled releases

**DON'T**:
- ❌ Deploy to 100% of production at once
- ❌ Skip smoke tests post-deployment
- ❌ Ignore deployment metrics
- ❌ Deploy without a rollback plan

### 4. Fail Fast, Recover Faster

**DO**:
- ✅ Fail builds immediately on critical issues
- ✅ Parallelize independent jobs
- ✅ Cache dependencies aggressively
- ✅ Optimize test execution order (fast tests first)
- ✅ Set timeouts on all jobs

**DON'T**:
- ❌ Run all tests sequentially
- ❌ Wait for low-priority checks before critical ones
- ❌ Continue pipeline after detecting critical failures
- ❌ Allow jobs to hang indefinitely

## Workflow Design

### Job Structure

**Optimal Job Flow**:
```yaml
jobs:
  # Stage 1: Quick validation (1-2 minutes)
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - Linting
      - Type checking
      - Import boundaries
  
  # Stage 2: Parallel testing (3-5 minutes)
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - Unit tests with coverage
  
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - Integration tests
  
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - Secret scanning
      - Dependency audit
      - SAST
  
  # Stage 3: Build (depends on stage 1 & 2)
  build:
    needs: [lint-and-typecheck, unit-tests, security-scan]
    runs-on: ubuntu-latest
    steps:
      - Build application
      - Build containers
      - Generate SBOM
  
  # Stage 4: Deep testing (depends on build)
  e2e-tests:
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - E2E tests
  
  accessibility-tests:
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - WCAG 2.2 AA+ validation
```

### Dependency Management

**DO**:
```yaml
# Use needs to parallelize where possible
jobs:
  test-unit:
    runs-on: ubuntu-latest
    # No dependencies - runs immediately
  
  test-integration:
    runs-on: ubuntu-latest
    # No dependencies - runs in parallel with unit tests
  
  build:
    needs: [test-unit, test-integration]
    # Waits for both test jobs
```

**DON'T**:
```yaml
# Unnecessary sequential execution
jobs:
  test-unit:
    runs-on: ubuntu-latest
  
  test-integration:
    needs: [test-unit]  # ❌ Unnecessary dependency
  
  build:
    needs: [test-integration]
```

## Security Best Practices

### Secret Management

**DO**:
```yaml
# Use GitHub secrets
- name: Deploy
  env:
    API_KEY: ${{ secrets.API_KEY }}
  run: ./deploy.sh

# Use OIDC for cloud providers
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
    role-session-name: GitHubActions-${{ github.run_id }}
```

**DON'T**:
```yaml
# ❌ Hardcoded secrets
- name: Deploy
  env:
    API_KEY: "sk-abc123..."  # NEVER DO THIS
  run: ./deploy.sh

# ❌ Secrets in logs
- name: Debug
  run: echo "API Key: ${{ secrets.API_KEY }}"  # NEVER DO THIS
```

### Container Scanning

**DO**:
```yaml
- name: Scan container with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE }}
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'  # Fail on findings

- name: Upload results
  uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: 'trivy-results.sarif'
```

### SBOM Generation

**DO**:
```yaml
- name: Generate SBOM
  uses: anchore/sbom-action@v0
  with:
    image: ${{ env.IMAGE }}
    format: cyclonedx-json
    output-file: sbom.json

- name: Upload SBOM
  uses: actions/upload-artifact@v4
  with:
    name: sbom-${{ github.sha }}
    path: sbom.json
    retention-days: 90
```

## Quality Gates

### Required Gates (Blocking)

1. **Linting**: Enforce code style
   ```yaml
   - name: Lint
     run: npm run lint
     # Fails on any violations
   ```

2. **Type Checking**: Catch type errors
   ```yaml
   - name: Type Check
     run: npm run typecheck
   ```

3. **Tests**: Minimum 80% coverage
   ```yaml
   - name: Test
     run: npm run test -- --coverage
   - name: Check coverage
     run: |
       COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
       if (( $(echo "$COVERAGE < 80" | bc -l) )); then
         echo "Coverage $COVERAGE% is below 80%"
         exit 1
       fi
   ```

4. **Accessibility**: WCAG 2.2 AA+ compliance
   ```yaml
   - name: Accessibility Tests
     run: npm run test:a11y
   ```

5. **Security**: No Critical/High vulnerabilities
   ```yaml
   - name: Security Audit
     run: npm audit --audit-level=high
   ```

### Optional Gates (Warning Only)

- Medium/Low vulnerabilities
- Code smells
- Unused dependencies
- Documentation updates

## Performance Optimization

### Caching Strategies

**Dependencies**:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm'  # Automatic caching

- run: npm ci  # Uses cache automatically
```

**Docker Builds**:
```yaml
- name: Build Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: false
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Custom Caching**:
```yaml
- name: Cache build outputs
  uses: actions/cache@v3
  with:
    path: dist/
    key: ${{ runner.os }}-build-${{ hashFiles('src/**') }}
    restore-keys: |
      ${{ runner.os }}-build-
```

### Parallel Execution

**DO**:
```yaml
# Run tests in parallel
- name: Test
  run: npm run test -- --maxWorkers=4

# Use matrix for multiple environments
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, macos-latest]
    runs-on: ${{ matrix.os }}
```

### Optimization Checklist

- [ ] Cache dependencies (npm, Docker layers)
- [ ] Parallelize independent jobs
- [ ] Use matrix for multi-environment testing
- [ ] Set appropriate timeouts
- [ ] Optimize Docker layer ordering
- [ ] Use `npm ci` instead of `npm install`
- [ ] Skip unnecessary steps with conditions

## Observability

### Structured Logging

**DO**:
```yaml
- name: Deploy
  run: |
    echo '{"level":"info","msg":"Starting deployment","deployment_id":"${{ github.run_id }}"}'
    ./deploy.sh
    echo '{"level":"info","msg":"Deployment complete","deployment_id":"${{ github.run_id }}","duration_ms":12000}'
```

### Metrics Collection

**DO**:
```yaml
- name: Track deployment metrics
  run: |
    ./scripts/ci/otel-monitor.sh deployment \
      deploy-${{ github.sha }} \
      ${{ github.event.inputs.environment || 'staging' }} \
      started
```

### Artifact Retention

**DO**:
```yaml
- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: build-${{ github.sha }}
    path: dist/
    retention-days: 30  # Match compliance requirements

- name: Upload SBOM
  uses: actions/upload-artifact@v4
  with:
    name: sbom-${{ github.sha }}
    path: sbom.json
    retention-days: 90  # Longer for compliance
```

## Error Handling

### Graceful Degradation

**DO**:
```yaml
- name: Run optional check
  run: npm run optional-check
  continue-on-error: true  # Don't fail pipeline

- name: Upload results
  if: always()  # Run even if previous step fails
  uses: actions/upload-artifact@v4
```

### Conditional Execution

**DO**:
```yaml
# Only on main branch
- name: Deploy
  if: github.ref == 'refs/heads/main'
  run: ./deploy.sh

# Only on pull requests
- name: Comment on PR
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v6

# Skip on documentation-only changes
- name: Build
  if: |
    !contains(github.event.head_commit.message, '[skip ci]')
  run: npm run build
```

### Rollback on Failure

**DO**:
```yaml
- name: Deploy
  id: deploy
  run: ./deploy.sh

- name: Rollback on failure
  if: failure() && steps.deploy.outcome == 'failure'
  run: ./rollback.sh
```

## Common Pitfalls

### 1. Secrets in Logs

**BAD**:
```yaml
- name: Debug
  run: |
    echo "Database URL: ${{ secrets.DATABASE_URL }}"
```

**GOOD**:
```yaml
- name: Debug
  run: |
    echo "Database connection configured"
```

### 2. Missing Error Handling

**BAD**:
```yaml
- name: Deploy
  run: |
    ./deploy.sh
    # If deploy fails, workflow continues
```

**GOOD**:
```yaml
- name: Deploy
  run: |
    set -e  # Exit on error
    ./deploy.sh
```

### 3. No Rollback Plan

**BAD**:
```yaml
- name: Deploy
  run: ./deploy.sh
# No rollback if deployment fails
```

**GOOD**:
```yaml
- name: Deploy
  id: deploy
  run: ./deploy.sh

- name: Rollback on failure
  if: failure()
  run: ./rollback.sh
```

### 4. Ignoring Accessibility

**BAD**:
```yaml
# No accessibility testing
jobs:
  test:
    steps:
      - run: npm run test
```

**GOOD**:
```yaml
jobs:
  test:
    steps:
      - run: npm run test
  
  accessibility:
    steps:
      - run: npm run test:a11y
```

### 5. No Monitoring

**BAD**:
```yaml
- name: Deploy
  run: ./deploy.sh
# No monitoring or health checks
```

**GOOD**:
```yaml
- name: Deploy
  run: ./deploy.sh

- name: Health check
  run: |
    for i in {1..30}; do
      if curl -f https://api.example.com/healthz; then
        echo "Health check passed"
        exit 0
      fi
      sleep 10
    done
    echo "Health check failed"
    exit 1
```

## Continuous Improvement

### Metrics to Track

- **Build Success Rate**: > 95%
- **Deployment Frequency**: > 5 per day (staging)
- **Lead Time**: < 2 hours (staging), < 4 hours (production)
- **MTTR**: < 15 minutes
- **Change Failure Rate**: < 5%

### Regular Reviews

- **Weekly**: Review failed builds and deployments
- **Monthly**: Analyze pipeline performance metrics
- **Quarterly**: Update best practices based on learnings

### Feedback Loop

1. Monitor pipeline metrics
2. Identify bottlenecks and failures
3. Implement improvements
4. Measure impact
5. Repeat

## References

- [CI/CD Architecture](ci-cd-architecture.md)
- [Deployment Runbook](../09-observability-and-ops/deployment-runbook.md)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/learn-github-actions/security-hardening-for-github-actions)
- [OWASP CI/CD Security](https://owasp.org/www-project-devsecops-guideline/)

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-10-29  
**Next Review**: 2026-01-29
