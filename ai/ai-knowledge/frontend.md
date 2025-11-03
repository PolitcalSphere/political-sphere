# Frontend Quick Reference

**Entry Points**
- `apps/frontend/src/server.js` – Node HTTP server that injects API data.
- `apps/frontend/src/components/` – React components rendered client-side.
- `apps/frontend/tests/accessibility.test.js` – Playwright accessibility smoke test.

**Commands**
```bash
node apps/frontend/src/server.js
npx playwright test apps/frontend/tests/accessibility.test.js
```

**Security & Accessibility**
- CSP, HSTS, and other security headers defined in `src/server.js`.
- HTML template in `apps/frontend/public/index.html`; refresh via POST `/__reload`.
- Maintain ARIA attributes and colour contrast thresholds when editing components.
