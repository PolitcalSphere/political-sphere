// STATUS: PENDING_IMPLEMENTATION
import { defineConfig } from "@playwright/test";

// Playwright configuration
// STATUS: OPERATIONAL (API webServer), PENDING_IMPLEMENTATION (frontend webServer)
// Notes:
//  - Previous attempt using array webServer objects did not start API reliably; simplified to single object.
//  - Health readiness handled implicitly by waiting for port; explicit URL property removed.
//  - Frontend server kept commented until apps/web dev server is validated.

const API_PORT = Number(process.env.API_PORT || 3001);
const API_COMMAND = process.env.API_E2E_COMMAND || "npm run start:api"; // script defined in root package.json
const WEB_PORT = Number(process.env.WEB_PORT || 3002);
const WEB_COMMAND =
  process.env.WEB_E2E_COMMAND || "cd apps/web && node server.js";

export default defineConfig({
  timeout: 30000,
  use: {
    baseURL:
      process.env.WEB_BASE_URL ||
      process.env.BASE_URL ||
      "http://localhost:3000",
    headless: true,
  },
  webServer: [
    {
      command: API_COMMAND,
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        API_BASE_URL: `http://localhost:${API_PORT}`,
      },
    },
    {
      command: WEB_COMMAND,
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        WEB_BASE_URL: `http://localhost:${WEB_PORT}`,
      },
    },
  ],
});
