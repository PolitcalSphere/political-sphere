# Infrastructure (Terraform) — quick start

This folder contains the Terraform configuration for the application's infrastructure.

Quick recommended steps to validate the configuration locally (macOS / bash):

1) Install Terraform (recommended: `tfenv` so you can pin versions per-project).

  - tfenv (recommended):
    ```bash
    brew install tfenv
    tfenv install 1.6.7
    tfenv use 1.6.7
    terraform -version
    ```

  - Homebrew (quick):
    ```bash
    brew tap hashicorp/tap
    brew install hashicorp/tap/terraform
    terraform -version
    ```

2) Configure AWS credentials (one of):

  - `aws configure` to set a default profile, or
  - export environment variables:
    ```bash
    export AWS_ACCESS_KEY_ID=...
    export AWS_SECRET_ACCESS_KEY=...
    export AWS_REGION=us-east-1
    ```

3) Validate the Terraform configuration (run from this directory):

  ```bash
  cd apps/infrastructure/terraform
  terraform init
  terraform fmt -check
  terraform validate
  # preview changes (requires AWS creds and access to current state/backend)
  terraform plan -var="enable_jaeger_https=true"
  ```

Notes
- We recommend running `terraform validate` and `terraform fmt -check` on every PR. A GitHub Actions workflow is included in the repo to run these checks automatically.
- Be careful with `terraform apply` in production; always plan and review changes first.
- If you run into version mismatches, use `tfenv` or `asdf` to match the Terraform version used in CI.

If you want, I can add a `required_version` block to the configuration to pin the Terraform version used by this project.
