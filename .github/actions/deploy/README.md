# Deploy to EKS Composite Action

**Version:** 1.0.0  
**Last Updated:** 2025-11-07  
**Owner:** DevOps Team

## Overview

Production-grade GitHub Actions composite action for deploying applications to AWS Elastic Kubernetes Service (EKS). Supports multiple deployment strategies with automated health checks, rollback capabilities, and comprehensive security validation.

This action implements enterprise deployment best practices researched from:

- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [AWS OIDC Authentication](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [Kubernetes Deployment Strategies](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Microsoft Learn: GitHub Actions Best Practices](https://learn.microsoft.com/en-us/azure/developer/github/github-actions)

## Features

✅ **Multiple Deployment Strategies**

- Rolling updates (default, zero-downtime)
- Blue-Green deployments (instant rollback capability)
- Canary deployments (gradual traffic shifting with configurable percentages)

✅ **Security-First Design**

- AWS OIDC authentication (no long-lived credentials)
- Container image vulnerability scanning (Trivy)
- SBOM generation (Syft, SPDX-JSON format)
- Kubernetes manifest validation (schema, security policies, best practices)
- Secrets managed via AWS Secrets Manager

✅ **Observability & Audit Trails**

- Structured logging with GitHub Actions annotations
- Kubernetes resource annotations (commit SHA, run ID, actor, timestamp)
- Deployment metrics output (status, version, URL, timestamp)
- Integration with Prometheus/Grafana monitoring

✅ **Automated Health Checks & Rollback**

- Configurable health check endpoints
- Automatic rollback on deployment failure
- Manual rollback capability
- Deployment timeout enforcement

## Prerequisites

### AWS Infrastructure

- EKS cluster (Kubernetes 1.29+)
- ECR repositories for container images
- IAM role with EKS and ECR permissions
- OIDC provider configured in AWS

### GitHub Secrets

Configure these secrets in your repository (`Settings > Secrets and variables > Actions`):

| Secret               | Description                          | Example                                                |
| -------------------- | ------------------------------------ | ------------------------------------------------------ |
| `AWS_ROLE_TO_ASSUME` | IAM role ARN for OIDC authentication | `arn:aws:iam::123456789012:role/github-actions-deploy` |
| `AWS_REGION`         | AWS region for EKS cluster           | `us-east-1`                                            |
| `EKS_CLUSTER_NAME`   | Name of your EKS cluster             | `political-sphere-prod`                                |

### Required Tools

The action automatically installs these tools if not present:

- kubectl (Kubernetes CLI)
- aws-cli (AWS command-line interface)
- trivy (Container vulnerability scanner)
- syft (SBOM generator)

Optional but recommended:

- kubeval (Kubernetes schema validation)
- kube-score (Best practices analysis)

## Usage

### Basic Deployment (Rolling Strategy)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write # Required for OIDC
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to EKS
        uses: ./.github/actions/deploy
        with:
          environment: production
          aws-region: ${{ secrets.AWS_REGION }}
          aws-role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          eks-cluster-name: ${{ secrets.EKS_CLUSTER_NAME }}
          application: frontend
          image-tag: ${{ github.sha }}
```

### Canary Deployment (Gradual Rollout)

```yaml
- name: Canary Deploy to Production
  uses: ./.github/actions/deploy
  with:
    environment: production
    aws-region: us-east-1
    aws-role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
    eks-cluster-name: political-sphere-prod
    application: api
    image-tag: v1.2.3
    deployment-strategy: canary
    canary-percentage: 20 # Start with 20% of traffic
    health-check-enabled: true
    health-check-path: /healthz
```

### Blue-Green Deployment (Zero-Downtime)

```yaml
- name: Blue-Green Deploy
  uses: ./.github/actions/deploy
  with:
    environment: staging
    aws-region: us-east-1
    aws-role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
    eks-cluster-name: political-sphere-staging
    application: game-server
    image-tag: ${{ github.sha }}
    deployment-strategy: blue-green
    timeout: 10m
```

### Complete CI/CD Pipeline

```yaml
name: Build, Test, and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Build and Push Image
        run: |
          bash .github/actions/deploy/build-and-push.sh
        env:
          ENVIRONMENT: production
          APP_NAME: frontend
          IMAGE_TAG: ${{ github.sha }}
          ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Staging
        uses: ./.github/actions/deploy
        with:
          environment: staging
          aws-region: ${{ secrets.AWS_REGION }}
          aws-role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          eks-cluster-name: political-sphere-staging
          application: frontend
          image-tag: ${{ github.sha }}
          deployment-strategy: rolling

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production # GitHub environment with manual approval
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Production (Canary)
        id: deploy
        uses: ./.github/actions/deploy
        with:
          environment: production
          aws-region: ${{ secrets.AWS_REGION }}
          aws-role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          eks-cluster-name: political-sphere-prod
          application: frontend
          image-tag: ${{ github.sha }}
          deployment-strategy: canary
          canary-percentage: 10
          health-check-enabled: true
          health-check-path: /healthz
          timeout: 15m

      - name: Output Deployment Info
        run: |
          echo "Deployment Status: ${{ steps.deploy.outputs.deployment-status }}"
          echo "Deployed Version: ${{ steps.deploy.outputs.deployed-version }}"
          echo "Deployment URL: ${{ steps.deploy.outputs.deployment-url }}"
```

## Inputs

| Input                  | Required | Default   | Description                                                   |
| ---------------------- | -------- | --------- | ------------------------------------------------------------- |
| `environment`          | Yes      | -         | Target environment (`dev`, `staging`, `production`)           |
| `aws-region`           | Yes      | -         | AWS region for EKS cluster (e.g., `us-east-1`)                |
| `aws-role-to-assume`   | Yes      | -         | IAM role ARN for OIDC authentication                          |
| `eks-cluster-name`     | Yes      | -         | Name of the EKS cluster                                       |
| `application`          | Yes      | -         | Application name (`frontend`, `api`, `worker`, `game-server`) |
| `image-tag`            | Yes      | -         | Container image tag to deploy (e.g., `v1.0.0` or commit SHA)  |
| `deployment-strategy`  | No       | `rolling` | Deployment strategy (`rolling`, `blue-green`, `canary`)       |
| `canary-percentage`    | No       | `10`      | Percentage of traffic for canary deployment (1-100)           |
| `health-check-enabled` | No       | `true`    | Enable health checks after deployment                         |
| `health-check-path`    | No       | `/health` | HTTP path for health checks                                   |
| `health-check-retries` | No       | `30`      | Number of health check retry attempts                         |
| `timeout`              | No       | `10m`     | Deployment timeout duration                                   |
| `enable-rollback`      | No       | `true`    | Automatically rollback on failure                             |

## Outputs

| Output                 | Description                      | Example                            |
| ---------------------- | -------------------------------- | ---------------------------------- |
| `deployment-status`    | Deployment result status         | `success`, `failed`                |
| `deployed-version`     | Version/tag that was deployed    | `v1.2.3`                           |
| `deployment-url`       | URL of the deployed application  | `https://api.political-sphere.com` |
| `deployment-timestamp` | ISO 8601 timestamp of deployment | `2025-11-07T10:30:00Z`             |

## Deployment Strategies

### Rolling Update (Default)

**Best for:** Most deployments, production updates  
**Downtime:** Zero  
**Rollback:** Automatic via Kubernetes

Gradually replaces old pods with new ones. Kubernetes ensures minimum replica count is maintained.

**Characteristics:**

- Progressive pod replacement
- ConfigMap/Secret updates trigger automatic rollout
- Built-in surge and unavailability controls
- Fast rollback via `kubectl rollout undo`

### Blue-Green

**Best for:** Critical updates, high-risk releases  
**Downtime:** Zero  
**Rollback:** Instant (traffic switch)

Deploys new version alongside current version, then switches traffic.

**Characteristics:**

- Full environment duplication during deployment
- Instant rollback by switching service selector
- Higher resource usage temporarily
- Ideal for database migrations or major version changes

### Canary

**Best for:** Progressive rollouts, A/B testing  
**Downtime:** Zero  
**Rollback:** Gradual (reduce canary percentage)

Gradually shifts traffic to new version in controlled percentages.

**Characteristics:**

- Configurable traffic percentage (1-100%)
- Real-time monitoring of canary vs stable
- Manual or automated promotion
- Minimal blast radius for issues

## Health Checks

The action performs automated health checks after deployment:

1. **Kubernetes Readiness**: Waits for all pods to be ready
2. **HTTP Health Check**: Validates application health endpoint
3. **Retry Logic**: Configurable retry count with exponential backoff

Health check configuration:

```yaml
health-check-enabled: true
health-check-path: /healthz
health-check-retries: 30 # 30 attempts x 10s = 5 minutes max
```

If health checks fail:

- **Automatic rollback** (if `enable-rollback: true`)
- **Deployment marked as failed**
- **Error annotations** in Kubernetes resources
- **GitHub Actions workflow failure**

## Security Considerations

### OIDC Authentication

This action uses OpenID Connect (OIDC) for AWS authentication, eliminating the need for long-lived access keys.

**Benefits:**

- ✅ No secret rotation required
- ✅ Short-lived tokens (max 1 hour)
- ✅ Reduced credential exposure risk
- ✅ Auditable via AWS CloudTrail

**Required IAM Trust Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

### Image Scanning

Container images are automatically scanned for vulnerabilities before deployment:

- **Tool:** Trivy (comprehensive vulnerability database)
- **Severity Levels:** LOW, MEDIUM, HIGH, CRITICAL
- **Production Blocking:** HIGH and CRITICAL vulnerabilities block production deployments
- **Dev/Staging:** Only CRITICAL vulnerabilities block deployment

### Secrets Management

- **Application secrets:** Stored in AWS Secrets Manager
- **GitHub secrets:** Used only for AWS authentication
- **Kubernetes secrets:** Never committed to Git
- **Secret rotation:** Automated via AWS Secrets Manager

### Network Security

- **Pod Security Standards:** Enforced via admission controllers
- **Network Policies:** Restrict pod-to-pod communication
- **Service Mesh:** Optional Istio integration for mTLS
- **Ingress:** TLS termination at load balancer (ALB/NLB)

## Troubleshooting

### Deployment Failed: Pod Startup Issues

**Symptom:** Pods stuck in `CrashLoopBackOff` or `ImagePullBackOff`

**Solutions:**

```bash
# Check pod logs
kubectl logs -n <namespace> <pod-name>

# Describe pod for events
kubectl describe pod -n <namespace> <pod-name>

# Verify image exists in ECR
aws ecr describe-images --repository-name political-sphere/production/frontend --image-ids imageTag=<tag>
```

### Deployment Failed: Health Check Timeout

**Symptom:** Health checks never succeed

**Solutions:**

1. Verify health check path is correct
2. Check application logs for startup errors
3. Increase `health-check-retries` if application takes longer to start
4. Verify service and ingress configuration

```bash
# Test health endpoint from within cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://<service-name>.<namespace>.svc.cluster.local/health
```

### Deployment Failed: Insufficient Resources

**Symptom:** Pods stuck in `Pending` state

**Solutions:**

```bash
# Check node capacity
kubectl describe nodes | grep -A 5 "Allocated resources"

# Check pod resource requests
kubectl describe pod <pod-name> | grep -A 10 "Requests"

# Adjust resource limits in deployment manifests
```

### Rollback Required

**Manual Rollback:**

```bash
# Rollback to previous revision
kubectl rollout undo deployment/<app-name> -n <namespace>

# Rollback to specific revision
kubectl rollout undo deployment/<app-name> -n <namespace> --to-revision=<revision>

# Check rollout history
kubectl rollout history deployment/<app-name> -n <namespace>
```

### OIDC Authentication Failed

**Symptom:** `An error occurred (AccessDenied) when calling the AssumeRoleWithWebIdentity operation`

**Solutions:**

1. Verify IAM role ARN is correct
2. Check trust policy allows GitHub Actions OIDC
3. Ensure workflow has `id-token: write` permission
4. Verify repository and branch match trust policy conditions

### Image Not Found in ECR

**Symptom:** `Error: ImagePullBackOff` with ECR repository not found

**Solutions:**

1. Ensure build job completed successfully
2. Verify ECR repository was created
3. Check image tag matches deployment input
4. Verify ECR permissions allow EKS to pull images

## Governance & Maintenance

### Version Management

- **Semantic Versioning:** Major.Minor.Patch (1.0.0)
- **Breaking Changes:** Increment major version
- **New Features:** Increment minor version
- **Bug Fixes:** Increment patch version

### Change Process

1. Create feature branch from `main`
2. Update action code and tests
3. Update README.md with changes
4. Increment version in comments
5. Create pull request with ADR if architectural
6. Require review from DevOps team
7. Test in `dev` environment before merge
8. Update CHANGELOG.md on merge

### Support & Ownership

- **Primary Owner:** DevOps Team
- **Secondary Owner:** Platform Engineering
- **Escalation:** Technical Governance Committee (TGC)
- **SLA:** P1 (deployment blocking) - 1 hour response
- **SLA:** P2 (non-blocking issues) - 4 hour response

### Security Review Schedule

- **Quarterly:** Review IAM policies and permissions
- **Monthly:** Update base images and dependencies
- **On CVE:** Immediate patch for HIGH/CRITICAL vulnerabilities
- **Annual:** Full security audit by external team

### Performance Metrics

Track these metrics in Grafana dashboards:

- **Deployment Duration:** p50, p95, p99 latencies by strategy
- **Success Rate:** Percentage of successful deployments
- **Rollback Rate:** Frequency of automatic rollbacks
- **Health Check Failures:** False positive rate
- **Time to Rollback:** p95 time from detection to rollback

### Related Documentation

- [Deployment Runbook](../../../docs/09-observability-and-ops/operations.md)
- [Security Policy](../../../docs/06-security-and-risk/security.md)
- [AWS Infrastructure Setup](../../../libs/infrastructure/README.md)
- [Kubernetes Best Practices](../../../docs/05-engineering-and-devops/development/backend.md)

## Architecture Decision Records

### ADR-001: Composite Action vs Reusable Workflow

**Context:**  
GitHub Actions supports two patterns for sharing logic: composite actions and reusable workflows.

**Decision:**  
Use composite action for deployment logic.

**Rationale:**

- **Local Testing**: Composite actions can be tested locally without pushing to repository
- **Flexibility**: Can be called from multiple workflows with different configurations
- **Clarity**: Explicit input/output contracts improve maintainability
- **Portability**: Works on both GitHub-hosted and self-hosted runners
- **Versioning**: Easier to version and reference specific releases

**Consequences:**

- ✅ Easier debugging and local development
- ✅ Clear interface boundaries
- ✅ Reusable across multiple pipelines
- ⚠️ Slightly more verbose than reusable workflows
- ⚠️ Requires shell scripts for complex logic

**Reference:**

- [GitHub Docs: Creating Composite Actions](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)

---

### ADR-002: AWS OIDC Authentication (Zero Long-Lived Credentials)

**Context:**  
Traditional GitHub Actions deployments use AWS access keys stored as secrets, requiring rotation and secure storage.

**Decision:**  
Use OpenID Connect (OIDC) for AWS authentication, eliminating long-lived credentials.

**Rationale:**

- **Security**: Short-lived tokens (max 1 hour) reduce credential exposure window
- **Zero Rotation**: No manual secret rotation required
- **Auditability**: CloudTrail logs show GitHub Actions as principal
- **Least Privilege**: Granular IAM conditions based on repository/branch
- **Compliance**: Aligns with zero-trust security model (NIST 800-207)

**Required IAM Trust Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

**Consequences:**

- ✅ Eliminates credential rotation burden
- ✅ Reduces credential leak risk
- ✅ Meets GDPR/SOC2 compliance requirements
- ⚠️ Requires one-time OIDC provider setup in AWS
- ⚠️ Token lifetime limited to 1 hour (acceptable for deployments)

**References:**

- [AWS: Configuring OIDC in AWS](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [GitHub: OIDC Security Hardening](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)

---

### ADR-003: Multiple Deployment Strategies

**Context:**  
Different deployment scenarios have different risk profiles and requirements.

**Decision:**  
Support three deployment strategies with configurable selection: Rolling, Blue-Green, and Canary.

**Strategy Comparison:**

| Strategy   | Complexity | Resource Cost | Rollback Speed | Risk Mitigation |
| ---------- | ---------- | ------------- | -------------- | --------------- |
| Rolling    | Low        | Standard      | Fast (30s)     | Medium          |
| Blue-Green | Medium     | High (2x)     | Instant (<5s)  | High            |
| Canary     | High       | Low           | Gradual        | Very High       |

**When to Use Each Strategy:**

**Rolling Updates (Default):**

- ✅ Standard feature releases, bug fixes, configuration updates
- ❌ Avoid for: Database schema changes, breaking API changes

**Blue-Green Deployments:**

- ✅ Major version upgrades, database migrations, high-risk releases
- ❌ Avoid for: Resource-constrained environments, frequent small updates

**Canary Deployments:**

- ✅ Progressive feature rollouts, A/B testing, high-traffic applications
- ❌ Avoid for: Time-sensitive deployments, small user bases

**Consequences:**

- ✅ Flexibility for different risk profiles
- ✅ Industry-standard patterns
- ✅ Well-documented fallback procedures
- ⚠️ Teams must understand strategy selection
- ⚠️ Increased testing burden (3 strategies)

**References:**

- [Kubernetes: Deployment Strategies](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy)
- [Martin Fowler: Canary Release](https://martinfowler.com/bliki/CanaryRelease.html)

---

### ADR-004: Automated Health Checks with Configurable Rollback

**Context:**  
Manual post-deployment validation is error-prone and delays issue detection.

**Decision:**  
Implement automatic health checks with configurable rollback on failure.

**Rationale:**

- **Early Detection**: Catch issues before user impact
- **Automation**: Reduce manual validation burden
- **Consistency**: Same checks across all environments
- **Continuous Deployment**: Enable true CD with confidence

**Health Check Layers:**

1. **Kubernetes Readiness**: Pod readiness probes
2. **HTTP Health Endpoint**: Application-level health validation
3. **Dependency Checks**: Database, cache, external API connectivity
4. **Business Metrics**: Critical transaction success rate

**Rollback Decision Tree:**

```
Deployment Complete
    ↓
Health Check 1/N → PASS → Continue
    ↓ FAIL
Retry (backoff)
    ↓ FAIL
Auto Rollback? → YES → Execute Rollback → Alert Team
              → NO  → Alert Team → Manual Decision
```

**Consequences:**

- ✅ Faster incident detection
- ✅ Reduced MTTR (Mean Time To Recovery)
- ✅ Enables automated deployments
- ⚠️ False positives may trigger unnecessary rollbacks
- ⚠️ Requires well-designed health endpoints

---

## Security Best Practices

### Input Validation & Sanitization

All inputs are validated before use in shell commands to prevent injection attacks:

```bash
validate_environment() {
    case "${ENVIRONMENT}" in
        dev|staging|production)
            log_info "Valid environment: ${ENVIRONMENT}"
            ;;
        *)
            log_error "Invalid environment: ${ENVIRONMENT}"
            exit 1
            ;;
    esac
}
```

**Alignment:** OWASP ASVS 5.1.1 (Input Validation)

### Secrets Management

Secrets are never hardcoded and are masked in GitHub Actions logs:

```bash
# Mask sensitive values
echo "::add-mask::${ARGOCD_AUTH_TOKEN}"

# Use GitHub Secrets for storage
aws-role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
```

**Coverage:**

- GitHub repository secrets (OIDC role, API tokens)
- AWS Secrets Manager (database credentials, API keys)
- Kubernetes secrets (mounted as volumes, not environment variables)

**Alignment:** NIST SP 800-57 (Key Management)

### Container Image Security

All images are scanned for vulnerabilities before deployment:

```bash
# Trivy scan with severity threshold
trivy image --severity HIGH,CRITICAL \
  --exit-code 1 \
  "${ECR_REGISTRY}/${REPOSITORY}:${IMAGE_TAG}"
```

**Blocking Policy:**

| Environment | Block on Severity |
| ----------- | ----------------- |
| Production  | HIGH, CRITICAL    |
| Staging     | CRITICAL          |
| Development | (warn only)       |

**Alignment:** NIST SP 800-190 (Container Security), EO 14028 (Software Supply Chain)

### Least Privilege IAM Policies

IAM roles have minimum required permissions with resource-level and regional restrictions:

```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["eks:DescribeCluster"],
      "Resource": "arn:aws:eks:us-east-1:*:cluster/political-sphere-*",
      "Condition": {
        "StringEquals": { "aws:RequestedRegion": "us-east-1" }
      }
    }
  ]
}
```

**Principles Applied:**

- Resource-level permissions
- Regional restrictions
- Action-level granularity
- Time-based constraints (via OIDC token expiry)

---

## Observability & Metrics

**Deployment Metrics Tracked:**

1. **Deployment Duration** (p50, p95, p99) - Target: p95 < 10 min (rolling)
2. **Success Rate** - Target: 95% across all deployments
3. **Rollback Rate** - Automatic rollbacks / total deployments
4. **Health Check Failures** - False positive rate monitoring
5. **MTTR** (Mean Time To Recovery) - Target: < 5 minutes

**Kubernetes Resource Annotations:**

Every deployed resource includes audit metadata:

```yaml
annotations:
  deployment.political-sphere.com/deployed-at: "2025-11-07T10:30:00Z"
  deployment.political-sphere.com/deployed-by: "github-actions"
  deployment.political-sphere.com/commit-sha: "abc123def456"
  deployment.political-sphere.com/run-id: "123456789"
```

**Benefits:**

- ✅ Forensic investigation capability
- ✅ Compliance with SOC2/ISO27001
- ✅ Change attribution for incidents

---

## Compliance & Auditability

### GDPR Compliance

- ✅ No PII in deployment logs
- ✅ CloudTrail logs for access auditing
- ✅ Data residency controls (us-east-1 restriction)

### SOC2 Type II Control Mapping

| SOC2 Control              | Implementation                           |
| ------------------------- | ---------------------------------------- |
| CC6.1 (Logical Access)    | OIDC authentication, IAM least privilege |
| CC6.6 (Encryption)        | TLS 1.3 in transit, AES-256 at rest      |
| CC7.2 (Change Management) | PR reviews, automated testing            |
| CC8.1 (Audit Logging)     | CloudTrail, Kubernetes annotations       |

---

## Versioning & Maintenance

**Semantic Versioning (SemVer):**

- **Major (X.0.0)**: Breaking changes, removed inputs
- **Minor (1.X.0)**: New features, new strategies
- **Patch (1.0.X)**: Bug fixes, security patches

**Version Pinning Recommendation:**

```yaml
# ✅ Recommended: Pin to major version
- uses: ./.github/actions/deploy@v1

# ⚠️ Acceptable: Pin to specific version
- uses: ./.github/actions/deploy@v1.2.3

# ❌ Not recommended: Unpinned
- uses: ./.github/actions/deploy@main
```

**Security Update Cadence:**

- **Weekly**: Trivy vulnerability database
- **Monthly**: Base images, AWS CLI, kubectl
- **Quarterly**: Helm, ArgoCD CLI
- **Emergency**: Critical CVE within 24 hours

**Deprecation Process:**

1. **Announce** (90 days) - Add deprecation warnings
2. **Migrate** (60 days) - Provide migration guide
3. **Sunset** (30 days) - Log warnings in workflows
4. **Remove** (v2.0.0) - Update CHANGELOG.md

---

## Performance Targets

| Metric                           | Target       |
| -------------------------------- | ------------ |
| Deployment Duration (Rolling)    | p95 < 10 min |
| Deployment Duration (Blue-Green) | p95 < 15 min |
| Deployment Duration (Canary)     | p95 < 30 min |
| Health Check Latency             | p95 < 2s     |
| Rollback Duration                | p95 < 60s    |
| Deployment Success Rate          | > 95%        |
| Rollback Success Rate            | > 99%        |

---

## References & Standards

**Official Documentation:**

- [GitHub Actions: Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [AWS: OIDC for GitHub Actions](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [Kubernetes: Deployment Strategies](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

**Industry Standards:**

- [NIST SP 800-204: Microservices Security](https://csrc.nist.gov/publications/detail/sp/800-204/final)
- [OWASP ASVS 4.0.3](https://owasp.org/www-project-application-security-verification-standard/)
- [CIS Kubernetes Benchmark v1.8.0](https://www.cisecurity.org/benchmark/kubernetes)

**Research & Books:**

- _Site Reliability Engineering_ (Google, 2016)
- _Accelerate_ (Forsgren, Humble, Kim, 2018)
- _Continuous Delivery_ (Humble, Farley, 2010)

---

## License

See [LICENSE](../../../LICENSE) in repository root.

## Contributing

See [CONTRIBUTING.md](../../../CONTRIBUTING.md) for contribution guidelines.

---

**Questions or Issues?**  
Open an issue in the repository or contact the DevOps team.
