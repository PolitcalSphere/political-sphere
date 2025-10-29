# Political Sphere Infrastructure

Infrastructure-as-code (IaC) for Political Sphere across development, staging, and production environments. Terraform modules and environment definitions live here.

## Highlights

- Modular Terraform targeting AWS with multi-account readiness.
- Remote state stored in S3 with DynamoDB state locking.
- Environment overlays for dev/staging/prod.
- Built-in security scanning and policy gates.

## Getting Started

1. Install Terraform >= 1.6 and AWS CLI v2.
2. Configure AWS credentials with least privilege (see `docs/security.md`).
3. From an environment directory (for example `envs/dev`), run `terraform init` then `terraform plan`.
4. Use the provided GitHub Actions workflows to automate plan/apply with OIDC roles.

See `docs/architecture.md` in the sibling `docs/` repository for the bigger picture.
