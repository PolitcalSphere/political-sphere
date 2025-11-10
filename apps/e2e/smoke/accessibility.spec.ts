/**
 * Accessibility Smoke Tests
 *
 * Validates WCAG 2.2 AA compliance on critical pages using axe-core.
 * These tests catch common accessibility violations early in development.
 *
 * Run with: npm run test:smoke
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const WEB_BASE = process.env.WEB_BASE_URL || "http://localhost:3002";

test.describe("Accessibility - WCAG 2.2 AA Compliance", () => {
  test("homepage should have no critical accessibility violations", async ({
    page,
  }) => {
    await page.goto(WEB_BASE);

    // Run axe-core accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    // Assert no violations found
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("homepage should be keyboard navigable", async ({ page }) => {
    await page.goto(WEB_BASE);

    // Check that main content is focusable and visible
    const mainContent = page.locator('main, [role="main"], #root');
    await expect(mainContent).toBeVisible();

    // Test tab navigation reaches interactive elements
    await page.keyboard.press("Tab");
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    );

    // Verify something received focus (not just <body>)
    expect(focusedElement).not.toBe("BODY");
  });

  test("page should have valid document structure", async ({ page }) => {
    await page.goto(WEB_BASE);

    // Check for essential page structure
    const htmlLang = await page.locator("html").getAttribute("lang");
    expect(htmlLang).toBe("en");

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);

    // Check viewport meta tag exists
    const viewportMeta = await page.locator('meta[name="viewport"]').count();
    expect(viewportMeta).toBe(1);
  });

  test("interactive elements should have accessible names", async ({
    page,
  }) => {
    await page.goto(WEB_BASE);

    // Get all buttons and links
    const buttons = await page.locator("button").all();
    const links = await page.locator("a").all();

    // Check each button has accessible text or aria-label
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute("aria-label");
      const ariaLabelledBy = await button.getAttribute("aria-labelledby");

      expect(
        text?.trim() || ariaLabel || ariaLabelledBy,
        "Button must have accessible name"
      ).toBeTruthy();
    }

    // Check each link has accessible text or aria-label
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute("aria-label");
      const ariaLabelledBy = await link.getAttribute("aria-labelledby");

      expect(
        text?.trim() || ariaLabel || ariaLabelledBy,
        "Link must have accessible name"
      ).toBeTruthy();
    }
  });

  test("color contrast should meet WCAG AA standards", async ({ page }) => {
    await page.goto(WEB_BASE);

    // Run axe-core scan focused on color contrast
    const contrastResults = await new AxeBuilder({ page })
      .withTags(["wcag2aa"])
      .include("body")
      .analyze();

    // Filter for color contrast violations
    const contrastViolations = contrastResults.violations.filter(
      (v) => v.id === "color-contrast"
    );

    expect(contrastViolations).toHaveLength(0);
  });
});
