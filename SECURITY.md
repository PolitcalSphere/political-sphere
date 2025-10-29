# Security Policy

This repository enforces a fail-closed secrets scanning policy and documents how to report and respond to security issues.

Reporting

- If you discover a security vulnerability, open a private issue in this repository or contact the maintainers listed in CODEOWNERS.

Secrets & Credentials

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
