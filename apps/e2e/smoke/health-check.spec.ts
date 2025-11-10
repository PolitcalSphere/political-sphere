/**
 * Smoke Test: Basic Health Checks
 *
 * Quick smoke tests that verify the application is running and responding.
 * These tests should run fast (<30s) and catch critical failures.
 *
 * Run with: npm run test:smoke
 */

import { expect, test } from "@playwright/test";

// Allow skipping frontend tests when WEB_BASE_URL is not provided or frontend not running.
const WEB_BASE: string | null =
  process.env.WEB_BASE_URL ?? "http://localhost:3002";
// Frontend now starts via Playwright webServer (Vite). Remove conditional skipping; retain helper for future env gating.
function runFrontend(
  fn: (page: import("@playwright/test").Page) => Promise<void>
) {
  return async ({ page }: { page: import("@playwright/test").Page }) => {
    await fn(page);
  };
}

test.describe("Smoke Tests - Health Checks", () => {
  test(
    "frontend should respond with 200 status",
    runFrontend(async (page) => {
      const response = await page.goto(WEB_BASE as string);
      expect(response?.status()).toBe(200);
    })
  );

  test(
    "frontend should render without critical errors",
    runFrontend(async (page) => {
      await page.goto(WEB_BASE as string);

      // Check that the page has loaded
      await expect(page.locator("body")).toBeVisible();

      // Check for critical console errors
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });

      // Wait a moment for any errors to surface
      await page.waitForTimeout(2000);

      // Filter out known acceptable errors (if any)
      const criticalErrors = errors.filter(
        (error) => !error.includes("ResizeObserver") // Example: ignore non-critical warnings
      );

      expect(criticalErrors).toHaveLength(0);
    })
  );

  test("API health endpoint should respond", async ({ request }) => {
    const baseURL = process.env.API_BASE_URL || "http://localhost:3001";
    const response = await request.get(`${baseURL}/health`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("status");
    // Accept either 'ok' or 'healthy' depending on the service
    expect(["ok", "healthy"]).toContain(data.status);
  });

  test(
    "critical navigation should work",
    runFrontend(async (page) => {
      await page.goto(WEB_BASE as string);

      // Test that basic navigation works
      // This depends on your app structure - adjust as needed
      const mainContent = page.locator('main, [role="main"], #root');
      await expect(mainContent).toBeVisible();
    })
  );
});
