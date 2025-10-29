# Contributing to Political Sphere Infrastructure

We welcome improvements that keep the infrastructure reliable, secure, and automated.

## Workflow

1. Fork the repository or create a feature branch.
2. Run `terraform fmt`, `tflint`, `tfsec`, and `checkov` locally.
3. Open a pull request. The CI pipeline will run the same checks and require a passing `terraform plan`.
4. Tag `@political-sphere/platform-admins` for review for production impacting changes.

## Coding Standards

- Prefer reusable modules over large environment files.
- Keep variables documented with descriptions and sensible defaults.
- Include examples in `examples/` when adding new modules.

## Security

- Never hardcode secrets. Use Vault or AWS Secrets Manager.
- Follow least privilege IAM practices and document new permissions in `docs/security.md`.

## Release Notes

Document notable changes in the environment README and update runbooks if operational tasks change.
