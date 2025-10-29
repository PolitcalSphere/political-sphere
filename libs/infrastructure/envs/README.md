# Environment Overlays

Each environment directory (`dev`, `staging`, `prod`) wraps the root Terraform configuration as a module and provides environment-specific variables.

## Usage

1. Copy `terraform.tfvars.example` to `terraform.tfvars` and adjust values.
2. Export sensitive variables (for example `TF_VAR_rds_password`) instead of storing them in plaintext.
3. From the environment directory, run:
   ```bash
   terraform init
   terraform plan
   ```
4. Use the GitHub Actions workflow (`ci/workflows/iac-plan.yml`) for automated planning and applies using OIDC.

State is stored in an S3 bucket with DynamoDB locking (see `backend` blocks). Update bucket names if your organization uses different naming conventions.
