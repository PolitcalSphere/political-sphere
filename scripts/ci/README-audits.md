# Audit Scripts Documentation

**Version:** 1.1.0  
**Last Updated:** 2025-11-08

## Overview

Political Sphere includes comprehensive audit scripts to ensure security, quality, and compliance across all project components. These scripts follow industry standards and best practices, providing automated validation with auto-fix capabilities.

## Quick Start

### Run All Audits (Recommended)

```bash
# Run all audits with centralized reporting
npm run audit:all

# Run with auto-fix enabled
npm run audit:all:fix

# Run specific audit domains
npm run audit:security          # OpenAPI + GitHub only
npm run audit:containers        # DevContainer + Apps only
```

### Central Audit System (`audit-all.sh`)

**NEW in v1.1.0** - Comprehensive orchestration script that runs all audits with centralized logging and aggregated reporting.

**Features:**

- ✅ Run all audits or select specific domains
- ✅ Centralized audit log (JSONL format)
- ✅ Aggregated findings across all audit types
- ✅ JSON and human-readable reports
- ✅ Production readiness assessment
- ✅ Slack/Email notifications (optional)
- ✅ Parallel execution support (optional)

**Usage:**

```bash
# Run all audits
npm run audit:all

# Run with auto-fix
npm run audit:all:fix

# Run specific domains
npm run audit:openapi
npm run audit:devcontainer
npm run audit:github
npm run audit:apps

# Advanced: Environment variables
AUTO_FIX=true npm run audit:all
FAIL_ON_WARNINGS=true npm run audit:all
NOTIFY_SLACK=true SLACK_WEBHOOK_URL=https://... npm run audit:all
```

**Output:**

- Central log: `audit-results/audit-log.jsonl` (append-only, machine-readable)
- Summary: `audit-results/audit-summary.txt` (human-readable)
- JSON: `audit-results/audit-summary.json` (structured data)
- Individual audit reports in respective directories

---

## Recent Updates

### v1.1.0 (2025-11-08)

- **Added:** Central audit orchestration script (`audit-all.sh`) with aggregated reporting
- **Added:** Centralized audit log in JSONL format for historical tracking
- **Added:** Production readiness assessment across all audit domains
- **Added:** 8 new npm scripts for flexible audit execution
- **Added:** Optional Slack/Email notifications for audit results

### v1.0.1 (2025-11-08)

- **Fixed:** Critical bug where scripts would hang after Phase 1 due to bash arithmetic expansion returning false (exit code 1) when incrementing counters from 0
- **Changed:** All counter increments now include `|| true` to prevent premature script exit with `set -e`
- **Verified:** All three audit scripts (devcontainer, github, app) now execute successfully through all phases

---

## Individual Audit Scripts

### 1. OpenAPI Audit (`openapi-audit.sh`)

**Purpose:** Validates OpenAPI/Swagger specifications for correctness, security, and compliance.

**Industry Standards:**

- OpenAPI Specification 3.1.0
- OWASP API Security Top 10 2023 (all 10 categories)
- RFC 7807 Problem Details
- Microsoft Azure API Guidelines

**Key Features:**

- 13 validation phases
- Auto-fix capability for common issues
- Multi-tool integration (Spectral, Redocly, Vacuum)
- Comprehensive security checks
- Production readiness assessment

**Usage:**

```bash
# Standard audit
npm run openapi-audit

# With auto-fix
npm run openapi-audit:fix

# CI/CD mode (faster, no code generation)
npm run openapi-audit:ci
```

**Output Files:**

- `openapi-audit/results.json` - Detailed findings in JSON format
- `openapi-audit/summary.txt` - Human-readable summary
- `openapi-audit/auto-fix.log` - Auto-fix changelog
- `openapi-audit/backups/` - Backup files before auto-fixes

**Exit Codes:**

- `0` - Success (all checks passed or warnings only)
- `1` - Warnings found
- `2` - Critical errors found

---

### 2. DevContainer Audit (`devcontainer-audit.sh`)

**Purpose:** Validates DevContainer configurations for security and best practices.

**Industry Standards:**

- CIS Docker Benchmark v1.6.0
- Docker Best Practices
- VS Code DevContainer Specification v0.2.0
- OWASP Container Security

**Key Features:**

- Dockerfile linting with Hadolint
- devcontainer.json schema validation
- docker-compose.yml validation
- Security vulnerability scanning with Trivy
- Auto-fix for common misconfigurations

**Usage:**

```bash
# Standard audit
npm run devcontainer-audit

# With auto-fix
npm run devcontainer-audit:fix

# Skip specific checks
SKIP_HADOLINT=true npm run devcontainer-audit
```

**Validation Checks:**

- Dockerfile security (USER instruction, pinned versions, secrets)
- devcontainer.json structure (name, remoteUser, extensions)
- docker-compose syntax and security
- Base image vulnerabilities
- Container configuration best practices

**Output Files:**

- `devcontainer-audit/devcontainer-audit-results.json`
- `devcontainer-audit/summary.txt`
- `devcontainer-audit/hadolint-results.json`
- `devcontainer-audit/trivy-config.json`

---

### 3. GitHub Workflows Audit (`github-audit.sh`)

**Purpose:** Validates GitHub Actions workflows for security, efficiency, and best practices.

**Industry Standards:**

- GitHub Actions Security Hardening Guide
- OWASP CI/CD Security Top 10
- CIS Software Supply Chain Security Guide
- NIST SP 800-204C (DevSecOps)

**Key Features:**

- YAML syntax validation
- actionlint integration
- Security best practices enforcement
- Secrets scanning with gitleaks
- Workflow efficiency analysis

**Usage:**

```bash
# Standard audit
npm run github-audit

# With auto-fix
npm run github-audit:fix

# Skip secrets scanning
SKIP_SECRET_SCAN=true npm run github-audit
```

**Security Checks:**

- Script injection vulnerabilities
- Hardcoded credentials/tokens
- Improper permissions (write-all, broad scopes)
- Actions pinned to branches vs. SHAs
- pull_request_target usage risks
- Self-hosted runner security
- checkout action credential persistence

**Efficiency Checks:**

- Dependency caching usage
- Matrix strategy implementation
- Concurrency control
- Dependabot configuration

**Output Files:**

- `github-audit/github-audit-results.json`
- `github-audit/summary.txt`
- `github-audit/actionlint-results.json`
- `github-audit/gitleaks-report.json`
- `github-audit/yamllint-*.txt`

---

### 4. Application Audit (`app-audit.sh`)

**Purpose:** Validates individual application folders for security and quality.

**Industry Standards:**

- OWASP Top 10 2021
- OWASP API Security Top 10 2023
- npm Security Best Practices
- Node.js Security Best Practices
- NIST SP 800-53

**Key Features:**

- Dependency vulnerability scanning (npm audit, Snyk)
- package.json validation
- Code security pattern detection
- Environment variable security
- Auto-fix for dependency vulnerabilities

**Usage:**

```bash
# Audit specific apps
npm run app-audit:api
npm run app-audit:web
npm run app-audit:worker
npm run app-audit:game-server

# Custom app path
APP_PATH=./apps/custom bash scripts/ci/app-audit.sh

# With auto-fix (applies npm audit fix)
bash scripts/ci/app-audit.sh --app=api --auto-fix
```

**Validation Areas:**

**Package.json:**

- Valid JSON syntax
- Required fields (name, version)
- Node.js version specification (engines)
- Private flag (prevent accidental publish)
- Security scripts presence

**Dependencies:**

- npm audit for known vulnerabilities
- Snyk vulnerability scanning
- Outdated package detection
- License compliance

**Code Security:**

- eval() usage (dangerous)
- console.log statements (information disclosure)
- Hardcoded secrets/passwords
- SQL injection patterns
- Command injection risks

**Configuration:**

- .env file presence (should not be committed)
- .env.example validation
- Environment variable validation libraries
- Configuration security

**Output Files:**

- `app-audit-{app-name}/app-audit-results.json`
- `app-audit-{app-name}/summary.txt`
- `app-audit-{app-name}/npm-audit.json`
- `app-audit-{app-name}/snyk-test.json`
- `app-audit-{app-name}/npm-audit-fix-results.json`

---

## Centralized Audit Log

The central audit orchestration script maintains a comprehensive audit log in JSONL (JSON Lines) format.

**Location:** `audit-results/audit-log.jsonl`

**Format:** One JSON object per line, append-only for historical tracking

**Example entries:**

```json
{"timestamp":"2025-11-08T18:30:00Z","run_id":"20251108_183000","domain":"system","severity":"INFO","message":"Audit run started","details":"Run ID: 20251108_183000"}
{"timestamp":"2025-11-08T18:30:15Z","run_id":"20251108_183000","domain":"openapi","severity":"CRITICAL","message":"2 critical findings","details":"See /path/to/openapi-audit/results.json"}
{"timestamp":"2025-11-08T18:30:45Z","run_id":"20251108_183000","domain":"devcontainer","severity":"MEDIUM","message":"3 medium-severity findings","details":"See /path/to/devcontainer-audit/results.json"}
```

**Benefits:**

- **Historical tracking**: All audit runs permanently logged
- **Machine-readable**: Easy parsing with `jq`, `grep`, log aggregation tools
- **Audit trail**: Complete record for compliance and forensics
- **Trend analysis**: Track security posture over time

**Query examples:**

```bash
# View all critical findings
cat audit-results/audit-log.jsonl | jq 'select(.severity == "CRITICAL")'

# Get latest audit run summary
tail -20 audit-results/audit-log.jsonl | jq -s '.'

# Find all findings from specific domain
cat audit-results/audit-log.jsonl | jq 'select(.domain == "openapi")'

# Count findings by severity
cat audit-results/audit-log.jsonl | jq -s 'group_by(.severity) | map({severity: .[0].severity, count: length})'
```

---

## Running All Audits

**Recommended:** Use the central audit orchestration script for comprehensive validation:

```bash
# Run all audits with centralized reporting
npm run audit:all

# With auto-fix enabled
npm run audit:all:fix

# Fail build on warnings (CI/CD)
FAIL_ON_WARNINGS=true npm run audit:all
```

**What it does:**

1. Executes all selected audit domains sequentially
2. Aggregates findings across all audits
3. Generates centralized reports (TXT + JSON)
4. Appends entries to central audit log
5. Provides production readiness assessment
6. Sends notifications (if configured)

**Output files:**

- `audit-results/audit-log.jsonl` - Central audit log (append-only)
- `audit-results/audit-summary.txt` - Human-readable summary
- `audit-results/audit-summary.json` - Structured summary for tooling
- Individual audit directories (`openapi-audit/`, `devcontainer-audit/`, etc.)

**Advanced usage:**

```bash
# Run specific domains only
npm run audit:security          # OpenAPI + GitHub
npm run audit:containers        # DevContainer + Apps

# With environment variables
AUTO_FIX=true NOTIFY_SLACK=true SLACK_WEBHOOK_URL=https://... npm run audit:all

# Parallel execution (experimental)
PARALLEL=true npm run audit:all
```

---

## Environment Variables

All audit scripts support common environment variables:

| Variable            | Default           | Description                               |
| ------------------- | ----------------- | ----------------------------------------- |
| `AUTO_FIX`          | `false`           | Enable automatic fixes                    |
| `OUTPUT_DIR`        | `./audit-results` | Directory for output files                |
| `FAIL_ON_WARNINGS`  | `false`           | Exit with code 1 on warnings (CI/CD mode) |
| `NOTIFY_SLACK`      | `false`           | Send Slack notification                   |
| `SLACK_WEBHOOK_URL` | (none)            | Slack webhook URL for notifications       |
| `NOTIFY_EMAIL`      | `false`           | Send email notification (future)          |
| `PARALLEL`          | `false`           | Run audits in parallel (experimental)     |
| `AUDIT_DOMAINS`     | (all)             | Comma-separated list: openapi,github,apps |
| `SKIP_*`            | `false`           | Skip specific validation phases           |

**Example:**

```bash
AUTO_FIX=true FAIL_ON_WARNINGS=true OUTPUT_DIR=./custom-output npm run audit:all
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Security Audit

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run OpenAPI Audit
        run: npm run openapi-audit:ci

      - name: Run DevContainer Audit
        run: npm run devcontainer-audit

      - name: Run GitHub Audit
        run: npm run github-audit

      - name: Run Application Audits
        run: |
          npm run app-audit:api
          npm run app-audit:web

      - name: Upload Audit Reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: audit-reports
          path: |
            openapi-audit/
            devcontainer-audit/
            github-audit/
            app-audit-*/
```

---

## Interpreting Results

### Severity Levels

| Level        | Description                                           | Action Required            |
| ------------ | ----------------------------------------------------- | -------------------------- |
| **CRITICAL** | Severe security vulnerability or compliance violation | Must fix before production |
| **HIGH**     | Significant security risk or best practice violation  | Should fix before merge    |
| **MEDIUM**   | Moderate risk or code smell                           | Fix in sprint              |
| **LOW**      | Minor issue or optimization opportunity               | Fix when convenient        |
| **INFO**     | Informational finding or suggestion                   | Optional improvement       |
| **PASS**     | Validation passed successfully                        | No action needed           |

### Exit Codes

Scripts exit with specific codes for CI/CD integration:

- `0` - All checks passed or only warnings found
- `1` - Warnings or medium-severity issues found
- `2` - Critical or high-severity issues found (blocks deployment)

---

## Auto-Fix Capabilities

### OpenAPI Audit Auto-Fixes

- Missing `operationId` generation
- Bearer format specification
- RFC 7807 error responses
- Read-only field corrections

### DevContainer Audit Auto-Fixes

- (Currently limited - manual fixes recommended)

### GitHub Audit Auto-Fixes

- (Currently limited - manual fixes recommended)

### Application Audit Auto-Fixes

- `npm audit fix` for compatible dependency updates
- Automated security patches

**Important:** Auto-fixes create backups in `{output-dir}/backups/{timestamp}/` directory before making changes.

---

## Troubleshooting

### Common Issues

**Issue:** Script hangs after Phase 1 or exits silently with code 1

**Solution:** This was fixed in v1.0.1. If you're using an older version, update the scripts or manually add `|| true` to all counter increment operations:

```bash
# Old (causes hang with set -e):
((PASS_COUNT++))

# Fixed (prevents early exit):
((PASS_COUNT++)) || true
```

**Root Cause:** Bash arithmetic expansion `((expr))` returns exit code 1 when the expression evaluates to 0. With `set -euo pipefail`, this causes the script to exit immediately when incrementing a counter from 0.

---

**Issue:** "Tool not found" warnings

**Solution:** Install recommended tools:

```bash
# Hadolint (Dockerfile linting)
brew install hadolint

# actionlint (GitHub Actions validation)
brew install actionlint

# Trivy (vulnerability scanning)
brew install trivy

# Snyk (advanced security scanning)
npm install -g snyk

# yamllint (YAML validation)
pip install yamllint

# gitleaks (secrets scanning)
brew install gitleaks
```

**Issue:** "Permission denied" errors

**Solution:** Ensure scripts are executable:

```bash
chmod +x scripts/ci/*.sh
```

**Issue:** JSON parsing errors in reports

**Solution:** Install `jq`:

```bash
brew install jq  # macOS
apt-get install jq  # Linux
```

---

## Best Practices

1. **Run audits locally before pushing:**

   ```bash
   npm run audit:all
   ```

2. **Address critical/high findings immediately:**
   - Critical: Security vulnerabilities, exposed secrets
   - High: Best practice violations, injection risks

3. **Use auto-fix judiciously:**
   - Review auto-fix changes before committing
   - Test thoroughly after auto-fixes
   - Backup files are preserved in output directory

4. **Integrate into CI/CD:**
   - Run audits on pull requests
   - Block merges on critical findings
   - Generate audit reports as artifacts

5. **Regular maintenance:**
   - Update audit tools monthly
   - Review new findings from updated standards
   - Adjust thresholds based on project maturity

---

## Tool Installation

### macOS (Homebrew)

```bash
brew install hadolint actionlint trivy gitleaks jq yq
pip install yamllint
npm install -g snyk
```

### Linux (Ubuntu/Debian)

```bash
# Hadolint
wget -O /usr/local/bin/hadolint https://github.com/hadolint/hadolint/releases/latest/download/hadolint-Linux-x86_64
chmod +x /usr/local/bin/hadolint

# actionlint
go install github.com/rhysd/actionlint/cmd/actionlint@latest

# Trivy
sudo apt-get install wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy

# Other tools
sudo apt-get install jq
pip install yamllint
npm install -g snyk
```

### Docker (Alternative)

Run audits in Docker containers:

```bash
# Hadolint
docker run --rm -i hadolint/hadolint < .devcontainer/Dockerfile

# Trivy
docker run --rm -v $(pwd):/workspace aquasec/trivy config /workspace/.devcontainer
```

---

## Contributing

When adding new validation rules:

1. **Document the standard:** Include industry standard reference (OWASP, CIS, NIST, etc.)
2. **Provide auto-fix:** If possible, implement auto-remediation
3. **Test thoroughly:** Verify against real project files
4. **Update documentation:** Add to this README with examples

---

## Related Documentation

- [OpenAPI Audit Documentation](./README-openapi-audit.md)
- [Security Policy](../../docs/06-security-and-risk/security.md)
- [Testing Standards](../../docs/05-engineering-and-devops/development/testing.md)
- [CI/CD Best Practices](../../docs/09-observability-and-ops/operations.md)

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review tool-specific documentation (Hadolint, actionlint, etc.)
3. Create an issue in the repository with:
   - Script name and version
   - Full error output
   - Environment details (OS, Node.js version, tool versions)

---

**End of Audit Scripts Documentation v1.0.0**
