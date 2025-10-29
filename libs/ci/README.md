# Political Sphere CI Pipelines

Reusable GitHub Actions workflows and action composites for Political Sphere repositories. These pipelines enforce testing, security scanning, container builds, and GitOps deployment triggers.

## Layout

- `workflows/` – reusable workflow definitions (callable via `workflow_call`).
- `actions/` – custom composite actions (for example Terraform setup).

## Usage

Reference any workflow with `uses: political-sphere/ci/.github/workflows/<file>.yml@main` after pushing this repository. Each workflow documents required secrets, permissions, and inputs.

## Secrets & Permissions

Prefer GitHub OIDC federation with AWS IAM roles. Workflows assume the following repository secrets or variables are configured where relevant:

- `AWS_ROLE_TO_ASSUME`, `AWS_REGION`
- `ECR_URI` (per app repository)
- `SLACK_WEBHOOK_URL` (optional, for notifications)
- `TF_BACKEND_BUCKET`, `TF_BACKEND_DYNAMODB_TABLE`

Consult per-workflow headers for specifics.
