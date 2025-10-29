# Contributing quickstart

Thanks for contributing to Political Sphere! This quickstart helps you open a low-friction PR.

1. Branching
   - Create a topic branch from `main`: `git checkout -b feat/your-change`

2. Commit messages
   - Use Conventional Commits: `type(scope): short description` (e.g., `fix(api): handle 500 on login`).
   - We use these messages for automated changelogs and release tooling.

3. Run tests & lint locally
   - Install and prepare: `npm ci`
   - Run linters: `npm run lint`
   - Run tests: `npm test`

4. PR labels and size
   - Path-based labels are applied automatically by the labeler action (see `.github/labeler.yml`).
   - A size label (XS/S/M/L/XL) is applied to PRs so reviewers can triage quickly.

5. CI & checks
   - CI runs tests, lint, docs checks and security gates. Fix any failing checks before requesting review.

6. Good first contributions
   - Use the "Good first issue" issue form in `.github/ISSUE_TEMPLATE` to help onboard contributors; it will add `good first issue` label.

7. Questions & support
   - If you need help, open an issue labeled `triage` or contact the maintainers listed in `CODEOWNERS`.

---

## Conventional Commits (reference)

We use [Conventional Commits](https://conventionalcommits.org/).

Format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Common types:

- `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

Examples:

```
feat(api): add endpoint for user profiles
fix(auth): handle invalid token on refresh
docs: improve onboarding section
```

Thank you — your contributions keep the project healthy!
