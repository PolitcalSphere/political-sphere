# Automated Accessibility Testing with axe-core and Playwright

## 1. Install Dependencies (open source, zero cost)

Add these dev dependencies to your root `package.json`:

- `@axe-core/playwright`
- `playwright` (if not already present)

Install with:
```bash
npm install --save-dev @axe-core/playwright playwright
```

## 2. Example Playwright Accessibility Test

Create a test file, e.g. `apps/frontend/tests/accessibility.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('Home page should have no accessibility violations', async ({ page }) => {
    await page.goto('http://localhost:4200'); // Adjust port/path as needed
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

## 3. Add to CI

- Add a step to your CI workflow to run Playwright tests (e.g. `npx playwright test`).
- Ensure your dev server is running before the test step.

## 4. Document in Onboarding

Add a note to your onboarding docs about running accessibility tests with Playwright and axe-core.

---

For more details, see:
- https://github.com/axe-core/axe-playwright
- https://playwright.dev/docs/test-intro
