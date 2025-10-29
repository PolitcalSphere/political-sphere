# Political Sphere Security Overview

This document captures the security controls that ship with the baseline platform and highlights work still in flight.

## Identity & Access Management

- **AWS**: Terraform (`modules/iam`) provisions a GitHub OIDC provider and per-repository roles. Workflows assume roles via short-lived tokens.
- **Kubernetes**: EKS supports IRSA; Helm charts annotate ServiceAccounts with role ARNs (replace placeholders with real ARNs per environment).
- **Developers**: Use AWS IAM Identity Center for console/CLI access with MFA enforced.

## Secrets Management

- Short term: GitHub Actions secrets store API tokens (Argo CD) and environment-specific values.
- Long term: Planned integration with HashiCorp Vault or AWS Secrets Manager using ExternalSecrets for Kubernetes workloads (issue `SEC-12`).

## Data Protection

- **Encryption at Rest**:
  - RDS instances enforce storage encryption; final snapshot identifiers are randomized to avoid collisions.
  - S3 buckets default to private ACLs with SSE; configure `kms` variable for customer-managed keys.
  - EBS volumes for node groups rely on AWS-managed keys.
- **In Transit**:
  - Ingress terminates TLS via ACM certificates on NLB/ingress-nginx.
  - Redis enables in-transit TLS (`transit_encryption_enabled=true`).

## Network Security

- VPC module builds public/private subnets with optional NAT. Security groups restrict RDS/Redis access to VPC CIDR.
- Kubernetes namespaces ship with default deny NetworkPolicies and ResourceQuotas via `platform-core` chart templates.
- Future: define granular pod-to-pod network policies (ticket `NET-8`).

## Supply Chain

- Container images built through `build-and-test` workflow, scanned with Trivy before push.
- IaC scanning via tfsec + checkov; TFLint enforces Terraform best practices.
- Renovate configuration (`.github/renovate.json`) to be enabled post-delivery.

## Observability & Monitoring

- kube-prometheus-stack provides metrics and alerting (Alertmanager).
- Loki + Fluent Bit collect logs; Tempo handles distributed traces.
- Grafana seeded with Loki/Tempo data sources; dashboards packaged separately (future work).

## Incident Response

See `docs/runbooks/incident.md` for on-call procedures. PagerDuty integration pending (`SRE-4`). Argo CD notifications currently route to Slack `#platform-alerts`.

## Compliance & Auditing

- Terraform state stored in encrypted S3 bucket with DynamoDB locking (enable bucket versioning, lifecycle policies before prod cutover).
- Enable CloudTrail and GuardDuty in AWS account (task `SEC-15`).
- PodSecurity admission defaults to `baseline`/`restricted` across namespaces.

## Outstanding Work

- [ ] Configure Vault/Secrets Manager & ExternalSecrets operator.
- [ ] Finalize IAM policy boundaries for CI roles (principle of least privilege).
- [ ] Add Kyverno/Gatekeeper policies for privileged/hostPath workloads.
- [ ] Implement image signing (cosign) + admission verification.
- [ ] Automate RDS backup restore drills.
