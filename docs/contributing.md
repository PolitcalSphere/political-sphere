# Contributing quickstart

Thanks for contributing to Political Sphere! This quickstart helps you open a low-friction PR.

1. Branching

   - Create a topic branch from `main`: `git checkout -b feat/your-change`

2. Commit messages

   - Use Conventional Commits: `type(scope): short description` (e.g., `fix(api): handle 500 on login`).
   - We use these messages for automated changelogs and release tooling.

3. Node.js version

   - We standardise on Node.js 22.x across local dev and CI (see `.nvmrc`).
   - If you use `nvm`, run `nvm use` before installing dependencies to avoid lockfile drift.
   - Other runtimes (Docker, CI agents) are pinned to the same major to keep behaviour consistent.

4. Run tests & lint locally

   - Install and prepare: `npm ci`
   - Run linters: `npm run lint`
   - Run tests: `npm test`

5. PR labels and size

   - Path-based labels are applied automatically by the labeler action (see `.github/labeler.yml`).
   - A size label (XS/S/M/L/XL) is applied to PRs so reviewers can triage quickly.

6. CI & checks

   - CI runs tests, lint, docs checks and security gates. Fix any failing checks before requesting review.
   - Guard change budget check runs on PRs to enforce change limits based on execution mode (Safe/Fast-Secure/Audit/R&D).
   - Use execution modes in PR descriptions to control budget enforcement (see PR template for examples).

7. Good first contributions

   - Use the "Good first issue" issue form in `.github/ISSUE_TEMPLATE` to help onboard contributors; it will add `good first issue` label.

8. Questions & support
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
