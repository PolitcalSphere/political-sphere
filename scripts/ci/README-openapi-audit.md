# OpenAPI Comprehensive Audit Script

**Version:** 3.0.0  
**Last Updated:** 2025-11-08  
**Script:** `scripts/ci/openapi-audit.sh`

## Overview

Industry-standard OpenAPI specification validation script with automated remediation capabilities. This script performs comprehensive multi-phase validation against OpenAPI 3.1 specification, OWASP API Security Top 10 2023, RFC 7807, and Microsoft Azure API Guidelines.

## Features

### ✅ Multi-Phase Validation

1. **Phase 1**: OpenAPI Specification Bundling (swagger-cli)
2. **Phase 2**: Basic Validation (swagger-cli, openapi-generator)
3. **Phase 3**: OpenAPI 3.1/3.2 Compliance Checks
4. **Phase 4**: OWASP API Security Top 10 2023 Analysis
5. **Phase 5**: Documentation Completeness Assessment
6. **Phase 6**: RFC 7807 Problem Details Standard
7. **Phase 7**: Schema Quality Analysis
8. **Phase 8**: Spectral API Linting (industry standard)
9. **Phase 9**: Vacuum Comprehensive Linting
10. **Phase 10**: Redocly Validation
11. **Phase 11**: Extended Security Analysis (SSRF, business flows, third-party APIs)
12. **Phase 12**: Automated Remediation
13. **Phase 13**: Comprehensive Summary Report Generation

### 🔧 Automated Fixing

- Missing `operationId` generation
- `bearerFormat: JWT` addition to auth schemes
- Standard error responses (400, 401, 403, 404, 429, 500)
- `readOnly: true` for id/timestamp fields
- `writeOnly: true` for password fields

### 📊 Comprehensive Reporting

- Structured JSON findings (`docs/audit-trail/openapi/audit-findings.json`)
- Audit history in JSONL format (append-only log)
- Markdown summary report
- Auto-fix action log
- Backup files for all automated changes

## Quick Start

### Basic Usage

```bash
# Run full audit
npm run openapi-audit

# Or directly
bash scripts/ci/openapi-audit.sh
```

### With Auto-Fix Enabled

```bash
# Auto-fix common issues
npm run openapi-audit:fix

# Or directly
AUTO_FIX=true bash scripts/ci/openapi-audit.sh
```

### CI/CD Mode

```bash
# Fast mode for CI (skip slow generator validation)
npm run openapi-audit:ci

# Or directly
SKIP_GENERATOR=true AUTO_FIX=false bash scripts/ci/openapi-audit.sh
```

## Configuration

### Environment Variables

| Variable         | Default | Description                                      |
| ---------------- | ------- | ------------------------------------------------ |
| `AUTO_FIX`       | `true`  | Enable automated remediation of common issues    |
| `SKIP_GENERATOR` | `false` | Skip openapi-generator validation (speeds up CI) |
| `SKIP_SPECTRAL`  | `false` | Skip Spectral linting                            |
| `SKIP_VACUUM`    | `false` | Skip Vacuum linting                              |

### Example Configurations

```bash
# Development: Full audit with auto-fix
AUTO_FIX=true bash scripts/ci/openapi-audit.sh

# CI/CD: Fast audit without auto-fix
SKIP_GENERATOR=true AUTO_FIX=false bash scripts/ci/openapi-audit.sh

# Manual review: Audit only (no fixes)
AUTO_FIX=false bash scripts/ci/openapi-audit.sh

# Skip optional linters for speed
SKIP_SPECTRAL=true SKIP_VACUUM=true bash scripts/ci/openapi-audit.sh
```

## Industry Standards Compliance

### Validated Against

- **[OpenAPI Specification 3.1.0](https://spec.openapis.org/oas/v3.1.0)** - Official OAS standard
- **[OWASP API Security Top 10 2023](https://owasp.org/API-Security/)** - Security best practices
  - API1: Broken Object Level Authorization
  - API2: Broken Authentication
  - API3: Broken Object Property Level Authorization
  - API4: Unrestricted Resource Consumption
  - API5: Broken Function Level Authorization
  - API6: Unrestricted Access to Sensitive Business Flows
  - API7: Server Side Request Forgery
  - API8: Security Misconfiguration
  - API9: Improper Inventory Management
  - API10: Unsafe Consumption of APIs
- **[RFC 7807 Problem Details](https://www.rfc-editor.org/rfc/rfc7807.html)** - Standard error responses
- **[Microsoft Azure API Guidelines](https://learn.microsoft.com/azure/architecture/best-practices/api-design)** - API design best practices
- **[42Crunch API Security](https://42crunch.com/)** - Security-first API design
- **[Stoplight Spectral](https://stoplight.io/open-source/spectral)** - API style guide enforcement

## Required Tools

### Core Tools (Required)

```bash
# Install Node.js tools
npm install -g swagger-cli
npm install -g openapi-generator-cli
```

### Optional Tools (Enhanced Validation)

```bash
# Spectral - Advanced API linting
npm install -g @stoplight/spectral-cli

# Redocly - Industry-standard validation
npm install -g @redocly/cli

# Vacuum - Comprehensive OpenAPI analysis
# Visit: https://quobix.com/vacuum/

# jq - JSON parsing (most systems)
# macOS: brew install jq
# Linux: apt-get install jq
```

## Exit Codes

| Code | Meaning                    | Action Required             |
| ---- | -------------------------- | --------------------------- |
| 0    | No issues or only LOW/INFO | Safe to proceed             |
| 1    | HIGH priority issues       | Address before release      |
| 2    | CRITICAL issues            | DO NOT deploy to production |

## Output Files

### Generated Artifacts

```
openapi-audit/
├── bundle.yaml                       # Bundled OpenAPI spec
├── validation-report.txt             # Swagger CLI output
├── codegen-readiness.json           # Generator validation
├── spectral-report.json             # Spectral linting (if available)
├── vacuum-report.json               # Vacuum analysis (if available)
├── redocly-report.json              # Redocly validation (if available)
├── COMPREHENSIVE-AUDIT-SUMMARY.md   # Human-readable summary
├── auto-fix.log                     # Auto-fix actions (if enabled)
└── backups/                         # Backups of modified files
    └── *.bak

docs/audit-trail/openapi/
├── audit-findings.json              # Current findings (JSON)
└── audit-history.jsonl              # Historical audit log (JSONL)
```

### JSON Output Structure

```json
{
  "auditVersion": "3.0.0",
  "timestamp": "2025-11-08T12:00:00Z",
  "specification": {
    "path": "apps/api/openapi/api.yaml",
    "openApiVersion": "3.1.0"
  },
  "summary": {
    "totalIssues": 5,
    "critical": 0,
    "high": 0,
    "medium": 3,
    "low": 2,
    "info": 5,
    "autoFixed": 2
  },
  "findings": [
    {
      "severity": "MEDIUM",
      "category": "Documentation",
      "message": "Missing operationId on 2 endpoints",
      "recommendation": "Add unique operationId to each operation",
      "timestamp": "2025-11-08T12:00:00Z"
    }
  ],
  "statistics": {
    "paths": 18,
    "operations": 44,
    "schemas": 25,
    "securitySchemes": 3
  },
  "validationPassed": true,
  "productionReady": true,
  "autoFixEnabled": true
}
```

## Auto-Fix Capabilities

### Safely Auto-Fixable Issues

- ✅ Missing `operationId` generation (based on HTTP method + path)
- ✅ Adding `bearerFormat: JWT` to bearer token auth schemes
- ✅ Adding `readOnly: true` to system-managed fields (id, createdAt, updatedAt)
- ✅ Adding `writeOnly: true` to sensitive input fields (password, token)

### Manual Intervention Required

- ❌ Security vulnerabilities (OWASP violations)
- ❌ Complex schema restructuring
- ❌ Breaking API changes
- ❌ Business logic-specific validations

## CI/CD Integration

### GitHub Actions Example

```yaml
name: OpenAPI Validation

on:
  pull_request:
    paths:
      - "apps/api/openapi/**"
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: |
          npm install -g swagger-cli openapi-generator-cli
          npm install -g @stoplight/spectral-cli @redocly/cli

      - name: Run OpenAPI Audit
        run: npm run openapi-audit:ci

      - name: Upload Audit Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: openapi-audit-results
          path: |
            openapi-audit/
            docs/audit-trail/openapi/
```

## Custom Spectral Rulesets

Create `.spectral.yaml` in your project root for custom rules:

```yaml
extends: [[spectral:oas, all]]

rules:
  # Enforce operationId naming convention
  operation-operationId-valid-in-url:
    description: operationId must be camelCase
    given: $.paths[*][*].operationId
    severity: error
    then:
      function: pattern
      functionOptions:
        match: "^[a-z][a-zA-Z0-9]*$"

  # Require examples in all schemas
  schema-examples:
    description: All schemas should have examples
    given: $.components.schemas[*]
    severity: warn
    then:
      field: example
      function: truthy
```

## Troubleshooting

### Issue: "command not found: jq"

**Solution:**

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# Alpine Linux
apk add jq
```

### Issue: "Spectral not found"

**Solution:**

```bash
npm install -g @stoplight/spectral-cli
```

### Issue: "Auto-fix doesn't modify files"

**Cause:** Auto-fix requires `yq` tool for safe YAML manipulation.

**Solution:**

```bash
# macOS
brew install yq

# Linux
snap install yq
```

### Issue: "Generator validation times out"

**Solution:** Skip generator validation in CI:

```bash
SKIP_GENERATOR=true bash scripts/ci/openapi-audit.sh
```

## Best Practices

### Development Workflow

1. **Before committing**: Run `npm run openapi-audit:fix`
2. **Review auto-fixes**: Check `openapi-audit/auto-fix.log`
3. **Commit changes**: Include both spec and audit artifacts
4. **PR validation**: CI runs `npm run openapi-audit:ci`

### Production Readiness Checklist

- [ ] Zero CRITICAL issues
- [ ] Zero HIGH issues
- [ ] operationId coverage: 100%
- [ ] All endpoints have descriptions
- [ ] Standard error responses (400, 401, 403, 404, 500)
- [ ] Security schemes properly configured
- [ ] HTTPS enforced for production servers
- [ ] Rate limiting documented
- [ ] Spectral linting passes

## Version History

| Version | Date       | Changes                                                                            |
| ------- | ---------- | ---------------------------------------------------------------------------------- |
| 3.0.0   | 2025-11-08 | Comprehensive rewrite with auto-fix, multi-tool integration, extended OWASP checks |
| 2.0.0   | 2025-11-08 | Enhanced validation with OWASP Top 10 2023                                         |
| 1.0.0   | Initial    | Basic OpenAPI validation                                                           |

## References

- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0)
- [OWASP API Security Project](https://owasp.org/www-project-api-security/)
- [RFC 7807 - Problem Details](https://www.rfc-editor.org/rfc/rfc7807.html)
- [Microsoft API Design Guidelines](https://learn.microsoft.com/azure/architecture/best-practices/api-design)
- [Spectral Documentation](https://stoplight.io/open-source/spectral)
- [Redocly CLI](https://redocly.com/docs/cli/)
- [42Crunch API Security](https://42crunch.com/)

## Support

For issues or questions:

1. Check `openapi-audit/COMPREHENSIVE-AUDIT-SUMMARY.md`
2. Review `docs/audit-trail/openapi/audit-findings.json`
3. Consult security team for CRITICAL/HIGH issues
4. See project documentation in `docs/`

---

**Maintained by:** Political Sphere Engineering Team  
**License:** See project LICENSE file
