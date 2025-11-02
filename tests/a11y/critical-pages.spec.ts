import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = [
  "/", // homepage
  "/healthz", // optional health page; will not fail if 404
];

test.describe("Accessibility (serious+ violations must be 0)", () => {
  for (const p of pages) {
    test(`check ${p}`, async ({ page, baseURL }) => {
      const url = (baseURL || "http://localhost:3000") + p;
      await page.goto(url);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      if (serious.length > 0) {
        console.error("Accessibility violations (serious+):", JSON.stringify(serious, null, 2));
      }
      expect(serious.length).toBe(0);
    });
  }
});
