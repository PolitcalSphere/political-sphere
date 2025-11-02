# Audit Standard Operating Procedure (SOP)

# For Political Sphere Universal Audit

## Purpose

This SOP defines the process for conducting comprehensive audits of the Political Sphere project to ensure compliance with governance, security, quality, and operational standards.

## Scope

Applies to all audit modes: full, short, ci-safe, offline, agent-loop-safe.

## Inputs

- Repository state (code, configs, docs)
- Execution mode (Safe/Fast-Secure/Audit/R&D)
- Network availability (online/offline)
- Agent loop safety flag

## Evidence Collection

1. Run manifest: tool versions, hashes, timestamps
2. NDJSON findings stream with structured evidence
3. Log files for failed checks (.audit/\*.log)
4. SARIF output for CI integration

## Exit Gates

- **Blockers**: Must be resolved before merge/release
- **Warnings**: Should be addressed, logged to TODO
- **Info**: Best practices, logged for awareness

## Process Steps

1. Validate inputs and prerequisites
2. Execute checks per mode configuration
3. Collect and structure evidence
4. Generate reports (JSON, SARIF)
5. Apply exit criteria
6. Log results to ledger

## Roles & Responsibilities

- **Auditor**: Executes audit, interprets results
- **Control Owners**: Address findings in their domain
- **Governance Committee**: Reviews critical findings

## Escalation

- Critical security issues: Immediate escalation to Security Team
- Governance violations: Escalate to Technical Governance Committee
- Unresolvable blockers: Open blocking issue with evidence
