# Metadata Header Template

For all code, configuration, operational, strategic, and governance artefacts, use the following structured header format:

```
/**
 * @fileoverview [Brief description of the file's purpose]
 * @purpose [Detailed purpose statement]
 * @scope [Scope of application, e.g., environments, modules affected]
 * @lifecycle [Lifecycle stage, e.g., Active development, Maintenance]
 * @owner [Responsible owner or team, with contact]
 * @version [Semantic version, e.g., 1.0.0]
 * @state [Current state, e.g., Active, Deprecated]
 * @integrity SHA256: [Computed hash for traceability]
 */
```

This ensures instant comprehension, classification, and traceability by humans and AI systems.

## Enforcement

- Add to ESLint rules to check for presence of headers.
- Integrate into CI/CD for validation.
- Document in `docs/architecture.md`.
