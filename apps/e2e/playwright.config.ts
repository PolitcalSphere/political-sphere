// STATUS: PENDING_IMPLEMENTATION
import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    headless: true,
  },
});
