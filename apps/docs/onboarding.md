# Political Sphere Engineering Onboarding

Welcome aboard! This guide walks you through the first day tasks to become productive on the Political Sphere platform.

## Accounts & Access

1. **GitHub** – join the `political-sphere` organization and ensure 2FA is enabled.
2. **AWS** – request enrollment in the `political-sphere-dev` AWS account; you will receive an IAM Identity Center assignment that maps to least-privilege roles.
3. **Argo CD** – accounts are provisioned via SSO (Okta). Ask the platform team to grant read access to the `platform` AppProject.
4. **Slack** – join `#platform`, `#dev-core`, and `#alerts` channels.

## Local Environment Setup

1. **Clone Repo**

   ```bash
   git clone git@github.com:political-sphere/political-sphere.git
   cd political-sphere
   ```

2. **Install Tooling**
   - Node.js 20.x (use Volta or nvm)
   - Docker Desktop (or colima/podman)
   - Tilt (optional) `brew install tilt`
   - AWS CLI v2 + `aws eks` dependencies

3. **Bootstrap Env Files**

   ```bash
   cp dev/templates/.env.example .env
   cp dev/templates/.env.local.example .env.local
   ```

4. **Start Local Stack**

   ```bash
   npm install
   npm run docker:up
   npm run dev:all
   ```

   Visit http://localhost:3000 for the frontend, http://localhost:4000 for the API, and http://localhost:8025 for MailHog.

5. **Seed Database** (optional sample data)
   ```bash
   npm run docker:seed
   ```

## Daily Development Flow

- Commit messages follow Conventional Commits (`feat:`, `fix:`, etc.).
- Use Nx to execute scoped tasks (e.g., `npx nx test api`, `npx nx lint frontend`).
- Run `npm run lint` before submitting pull requests; CI performs lint/test/build/scan steps automatically.
- Pull requests require at least one reviewer from `@political-sphere/platform-admins` for infrastructure and `@political-sphere/security` for prod-impacting changes.

## Infrastructure Changes

1. Navigate to the desired environment folder (e.g., `infrastructure/envs/dev`).
2. Export AWS credentials (recommended: use `aws sso login`).
3. Run Terraform validation:
   ```bash
   terraform init
   terraform plan -var="rds_password=$(pass show political/rds/dev)"
   ```
4. Commit changes and open a PR. GitHub Actions will run `iac-plan` with tfsec/checkov/tflint.

## Deployment Workflow

- Merge to `main` automatically triggers build/test workflows for application repositories.
- Release pipelines (see `ci/workflows/application-release.yaml`) push images to ECR and sync the relevant Argo CD Application.
- Production deploys require manual approval in GitHub (environment protection) and notification in `#deployments` channel.

## Useful Commands

| Command               | Description                                |
| --------------------- | ------------------------------------------ |
| `npm run docker:up`   | Launch local infrastructure stack          |
| `npm run docker:down` | Tear down local stack and volumes          |
| `npm run dev:all`     | Run API + frontend + worker Nx dev servers |
| `npm run docker:seed` | Apply DB migrations and seed fixtures      |
| `npx nx graph`        | Visualize dependency graph                 |

## Getting Help

- **Platform Team** – `@political-sphere/platform-admins`
- **Incident Response** – see `docs/runbooks/incident.md`
- **Security** – `security@political-sphere.example`
- **Knowledge Base** – Confluence space `POLSPH` (coming soon)

Happy shipping! 🚀
