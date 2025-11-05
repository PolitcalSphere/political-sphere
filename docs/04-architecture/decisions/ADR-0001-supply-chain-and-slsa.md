# ADR-0001: Supply Chain Hardening & SLSA Plan

- Date: 2025-11-02
- Status: Proposed

## Context

We require verifiable supply-chain security: SBOMs, provenance attestations, and a target SLSA level.

## Decision

- Generate CycloneDX SBOM on each build via GitHub Actions and upload as artifact.
- Attest build provenance using GitHub `actions/attest-build-provenance@v1` for dist artifacts.
- Target SLSA Level 2 initially, with roadmap to Level 3 (hardened builders) in Q1.

## Consequences

- Improved transparency for dependencies and artifacts.
- Additional CI steps and artifacts to manage.

## Alternatives considered

- Cosign attestation action: opted for GitHub provenance for simplicity/integration.
- SPDX SBOM: CycloneDX chosen for ecosystem tooling support.
