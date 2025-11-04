# Security Policy

This repository enforces a fail-closed secrets scanning policy and documents how to report and respond to security issues.

## Reporting

- If you discover a security vulnerability, open a private issue in this repository or contact the maintainers listed in CODEOWNERS.

## Required Secrets & Credentials

### Application Secrets (Required for Runtime)

**JWT Authentication**:

- `JWT_SECRET` - Secret key for access tokens (minimum 32 characters, enforced)
- `JWT_REFRESH_SECRET` - Secret key for refresh tokens (minimum 32 characters, enforced)
- `JWT_EXPIRES_IN` - Access token expiry (default: '15m')
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiry (default: '7d')

Generate secure secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### GitHub Repository Secrets (Required for CI/CD)

Configure these secrets in GitHub repository settings (`Settings > Secrets and variables > Actions`):

**Testing & Coverage**:

- `CODECOV_TOKEN` - Token for uploading coverage reports to Codecov

**Security Scanning**:

- `SNYK_TOKEN` - Snyk API token for vulnerability scanning
- `SEMGREP_APP_TOKEN` - Semgrep Cloud token for SAST

**Deployment**:

- `AWS_ROLE_TO_ASSUME` - AWS IAM role ARN for OIDC authentication (format: `arn:aws:iam::ACCOUNT:role/ROLE_NAME`)

**Monitoring & Alerts** (Optional):

- `API_HEALTH_URL` - API health check endpoint (default: https://api-staging.political-sphere.com/healthz)
- `FRONTEND_HEALTH_URL` - Frontend health check endpoint (default: https://www-staging.political-sphere.com)
- `LHCI_GITHUB_APP_TOKEN` - Lighthouse CI GitHub app token
- `SLACK_WEBHOOK_URL` - Slack webhook for deployment notifications

### Environment Variable Validation

The application validates required secrets on startup and will fail fast if they are missing or insufficient:

- JWT secrets must be at least 32 characters long
- Missing secrets will log a FATAL error and prevent application start
- This prevents runtime failures and token invalidation issues

### Secret Rotation Policy

- **JWT Secrets**: Rotate quarterly or immediately if compromised
- **API Tokens**: Rotate according to provider recommendations (typically 90 days)
- **AWS Credentials**: Use OIDC for ephemeral credentials (no rotation needed)

## Secrets Scanning

- We run automated Gitleaks checks in CI and a fast staged scan locally via lefthook.
- If the scanner finds a secret in a PR, CI will fail and a report will be posted to the PR with details.

Immediate Response (if you committed secrets):

1. Revoke the leaked credential immediately (rotate the key, disconnect tokens, change passwords).
2. Remove the secret from the git history (use git filter-repo or BFG) and force-push the cleaned branch.
3. Add the new, rotated credential via secured secret storage (e.g., GitHub Secrets, Vault) — never commit it.
4. Update this repository's .gitleaks.toml allowlist only if the finding is a false positive; document the reason.

CI and Allowlist

- The `.gitleaks.toml` file contains allowlist entries for known test fixtures. Do not add real secrets to allowlist entries.

Contact

- For urgent incidents, contact the security team as described in CODE_OF_CONDUCT or your org's security processes.
