# Security & Trust (Zero-Trust Model)

**Version:** 1.7.0  
**Last Updated:** 2025-11-03  
**Applies To:** All code that handles authentication, authorization, data access, or secrets

---

## Identity & Access

Apply zero-trust principles: NEVER assume trust—always verify. Use least-privilege access. Implement strong authentication. Apply context-aware controls. Validate ALL inputs.

## Data Classification

Classify and protect data appropriately:

| Level            | Examples                                | Protection                            |
| ---------------- | --------------------------------------- | ------------------------------------- |
| **Public**       | Docs, public APIs                       | Standard                              |
| **Internal**     | Source code, internal docs              | Access control                        |
| **Confidential** | User data, analytics                    | Encryption + audit logs               |
| **Restricted**   | Credentials, PII, political preferences | Full encryption + tamper-evident logs |

## Secrets Management (Critical)

Secrets are never stored in the repository. Follow these patterns: ❌ Do NOT commit secrets (encrypted or not) into source control. ✅ Use managed secret stores (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, or cloud KMS-backed secrets). ✅ CI and automation must retrieve secrets using short-lived OIDC tokens or least-privilege service accounts/roles. ✅ For local development, use git-ignored `.env.local` or `.env` files managed by tools like `direnv` or `doppler`; never commit those files. ✅ Rotate keys on compromise and regularly (per security team policy). ✅ Add `.gitignore` entries to prevent accidental commits of local secret artifacts and caches. ✅ Flag potential leaks immediately and follow the incident response runbook.

## Supply Chain Security

Protect the software supply chain: Maintain SBOMs (Software Bill of Materials). Verify artifact integrity (checksums, signatures). Scan dependencies continuously. Use trusted registries only. Track provenance.

## Vulnerability Management

Prioritize security fixes by severity: 🔴 **Critical** (fix immediately—same day). 🟠 **High** (fix within 7 days). 🟡 **Medium** (fix within 30 days). 🟢 **Low** (address in maintenance cycle). Always consider political manipulation attack vectors.

## Privacy by Design

Embed privacy from the start: Collect minimum necessary data only. Document purpose and lawful basis. Support data subject rights (GDPR/CCPA): Access, deletion, correction, portability. Conduct Privacy Impact Assessments (PIAs) for sensitive features. Apply purpose limitation strictly.

## Cryptographic Standards

Use modern, well-vetted cryptographic primitives:

- **Transport**: TLS 1.3+ (secure ciphersuites only)
- **At-rest**: AES-256-GCM or equivalent authenticated encryption
- **Signatures**: Ed25519 preferred; ECDSA P-256 acceptable
- **Legacy**: Avoid new RSA deployments; if required for legacy interop, RSA-2048+ only
- **Key storage**: Keys must be in KMS/HSM solutions—not in source control or plaintext config
- **Key rotation**: Rotate on exposure and annually for long-lived keys (policy-controlled)

**Critical**: NEVER roll your own crypto; use well-vetted libraries and follow platform guidance.

## Security Auditability

Make security events traceable: Log all security-relevant events. Use tamper-evident logging. Balance auditability with privacy. Retain logs per compliance requirements. Enable forensic analysis.

## Third-Party Risk

Govern external dependencies: Assess vendor security posture. Document integration points clearly. Monitor third-party service health. Define SLAs and contracts. Plan for vendor failure scenarios.

## Secure Defaults

Design secure by default: Isolate environments (dev/staging/prod). Use least-privilege IAM roles. Verify content integrity. Implement abuse prevention. Fail secure (NOT fail open).
