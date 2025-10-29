# Political Sphere Platform Architecture

Political Sphere runs as an Nx monorepo with three delivery verticals:

- **Infrastructure** – Terraform modules that provision the AWS foundation (VPC, EKS, RDS, Redis, Route53, ACM, KMS, IAM, ECR, S3).
- **Platform** – Kubernetes Helm charts and Argo CD GitOps definitions for core cluster services and workloads.
- **CI** – Reusable GitHub Actions workflows and composite actions that implement build, scan, IaC validation, and GitOps deployment automation.
- **Dev Tooling** – Docker Compose / Tilt-based developer stack for local parity.

## High-Level Diagram

```
+--------------------+       +-------------------------+
| GitHub Actions     |       | AWS Account             |
| - build-and-test   |       | - VPC / Subnets         |
| - iac-plan         |  OIDC | - EKS Cluster           |
| - deploy-argocd    +------>+ - RDS / Redis / S3      |
+--------------------+       | - Route53 / ACM / KMS   |
                              | - ECR Repositories      |
                              +-------------------------+
                                         |
                                         | IRSA / ArgoCD Sync
                                         v
                                +-------------------------+
                                | Kubernetes (EKS)        |
                                | - platform-core chart   |
                                |   * ingress-nginx       |
                                |   * cert-manager        |
                                |   * external-dns        |
                                |   * Argo CD             |
                                |   * Monitoring Stack    |
                                |   * Loki / Tempo / FB   |
                                | - App charts (api, ... )|
                                | - Namespaces (dev/prod) |
                                +-------------------------+
```

## Terraform Module Composition

`infrastructure/main.tf` wires together reusable modules:

| Module            | Responsibility                                         | Notes                           |
| ----------------- | ------------------------------------------------------ | ------------------------------- |
| `modules/vpc`     | VPC, subnets, NAT, route tables                        | Supports NAT toggle per env     |
| `modules/eks`     | Control plane, node groups, IRSA OIDC provider, SGs    | Accepts node group map          |
| `modules/rds`     | PostgreSQL instance, subnet group, parameter group     | Generates final snapshot suffix |
| `modules/redis`   | ElastiCache replication group                          | Optional per env                |
| `modules/ecr`     | Repositories and optional replication                  | Enforces scanning               |
| `modules/route53` | Hosted zone + records                                  | Works for private/public        |
| `modules/acm`     | ACM certificate with optional DNS validation           | Emits validation records        |
| `modules/kms`     | KMS key with admin/user principals                     | Used for RDS/S3 encryption      |
| `modules/s3`      | Secure S3 buckets with lifecycle, logging, replication | Supports SSE/KMS                |
| `modules/iam`     | GitHub OIDC provider and per-repo roles                | Allows custom inline policy     |

Environment overlays (`envs/dev`, `envs/staging`, `envs/prod`) provide opinionated configurations: VPC CIDRs, nodegroup sizing, storage tiers, ACM SANs, bucket naming, and GitHub role policies. Each overlay uses the root module and stores state in S3 with DynamoDB locking (placeholder bucket/table names).

## Kubernetes Platform

The `platform/charts/platform-core` umbrella chart bundles cluster add-ons:

- **Ingress / Networking**: AWS NLB-backed ingress-nginx, cert-manager ClusterIssuers, external-dns with IRSA.
- **GitOps**: Argo CD installed and exposed via ingress with Slack notifications enabled.
- **Observability**: kube-prometheus-stack (Prometheus, Alertmanager, Grafana w/ Loki + Tempo data sources), Loki distributed logging, Tempo for traces, Fluent Bit DaemonSet shipping logs.
- **Policy / Namespaces**: Namespace manifests with resource quotas, LimitRanges, default NetworkPolicies for `dev`, `staging`, `prod`, and `ci`.

Application charts (`api`, `frontend`, `worker`, `auth`, `db-proxy`) all follow the same pattern: Helm-managed Deployment + Service + HPA + optional ConfigMap/Ingress. Values files per environment set image tags and IRSA annotations. Argo CD Applications reference the charts with `values-[env].yaml` overlays.

## CI/CD Flow

1. **Build/Test** (`ci/workflows/build-and-test.yaml`)
   - Run Nx lint/test/build targets.
   - Build a container image, scan with Trivy, push to ECR (if AWS secrets provided).
   - Publish built image URI as an artifact.
2. **Release Orchestration** (`ci/workflows/application-release.yaml`)
   - Calls the build workflow.
   - Reads the pushed image tag and invokes `deploy-argocd` to sync the target application with the new tag.
3. **IaC Validation** (`ci/workflows/iac-plan.yaml`)
   - Uses composite action `setup-terraform` for consistent versions.
   - Runs `terraform fmt`, `tflint`, `tfsec`, `checkov`, and optionally `terraform plan` under an OIDC-assumed role.
4. **Argo CD Sync** (`ci/workflows/deploy-argocd.yaml`)
   - Installs argocd-cli, logs in using API token, optionally applies parameter overrides, syncs & waits for health.

## Local Development

- `apps/dev/docker/docker-compose.dev.yaml` mirrors production services (API, frontend, worker, Keycloak-based auth, PostgreSQL, Redis, LocalStack, MailHog, pgAdmin).
- `apps/dev/scripts/dev-up.sh` / `dev-down.sh` manage the stack. `seed-data.sh` runs migrations/seeding using Prisma or fallback scripts.
- `apps/dev/templates/.env.example` and `.env.local.example` provide environment bootstrap.
- Optional `apps/dev/Tiltfile` runs compose via Tilt for better visibility.
- Application containers (`api`, `frontend`, `worker`) are only started when their Dockerfiles exist in `apps/<service>/Dockerfile`; otherwise the scripts create infrastructure services only.

## Secrets & Identity

- GitHub Actions assume AWS roles via OIDC (`modules/iam`).
- Kubernetes workloads rely on IRSA (roles annotated in Helm values) and Vault / Secrets Manager integration (to be populated later).
- S3 buckets default to private ACLs with SSE and optional KMS keys.

## Disaster Recovery & Backups

- RDS module enforces snapshots (`final_snapshot_identifier`) and supports Multi-AZ for upper environments.
- S3 module allows lifecycle rules to tier/expire objects.
- Compose stack includes `localstack` to validate infrastructure automation offline.
- Future documentation (see `runbooks/incident.md`) details backup/restoration runbooks.

## Future Enhancements

- Add GitOps policy enforcement (Kyverno/Gatekeeper) once admission policies are defined.
- Extend Argo CD Applications to helmfile or app-of-apps pattern if repo splitting occurs.
- Integrate Vault ExternalSecrets when secrets backend is selected.
