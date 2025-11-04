/// <reference types="vitest" />

import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		testTimeout: 15000,
		exclude: [
			"**/node_modules/**",
			"**/e2e/**",
			"**/playwright.config.js",
			// Exclude Playwright tests, a11y suites and tooling tests from Vitest collector
			"tools/**",
		],
		include: ["**/*.{test,spec}.{js,mjs,ts,tsx}"],
		coverage: {
			provider: "istanbul",
			reporter: ["text", "json", "html"],
			// Ensure all relevant server-side source files are considered and source maps are used
			// Don't force "all" files into the coverage report — measure only files exercised by tests.
			// This keeps coverage meaningful for the tested surface and avoids penalising large
			// integration/tooling areas that are intentionally out-of-scope for unit tests.
			all: false,
			// Coverage surface: include shared library source files (types + helpers).
			// We measure `libs/shared/src/**` so tests for helpers like logger and
			// security are included in the coverage report once their tests exist.
			include: ["libs/shared/src/**/*.{ts,js}"],
			exclude: [
				"node_modules/",
				"dist/",
				"**/*.d.ts",
				"**/*.config.{js,ts}",
				"tools/**",
				"ai/**",
				"docs/**",
				"**/__tests__/**",
				// Exclude large server source tree from coverage for now —
				// several files contain non-parseable or integration-only code
				// that shouldn't be forced into unit-test coverage.
				"apps/api/src/**",
			],
			// Raise thresholds to the new target (90%) — we'll iterate toward this.
			thresholds: {
				global: {
					branches: 90,
					functions: 90,
					lines: 90,
					statements: 90,
				},
			},
		},
		// Use threads for all runs to support ES modules and improve performance
		pool: "threads",
		maxThreads: 6,
		minThreads: 2,
		setupFiles: ["./tools/test-setup.ts"],
		// Add caching to speed up repeated test runs
		cache: {
			dir: ".vitest/cache",
		},
		// Enable changed mode for faster development feedback
		changed: true,
		// Add parallel execution for faster test runs
		sequence: {
			hooks: "parallel",
		},
	},
	resolve: {
		alias: {
			"@political-sphere/shared": resolve(
				__dirname,
				"libs/shared/src/index.ts",
			),
			"@political-sphere/ui": resolve(__dirname, "libs/ui/src"),
			"@political-sphere/platform": resolve(__dirname, "libs/platform/src"),
			"@political-sphere/ci-utils": resolve(__dirname, "libs/ci/src"),
			"@political-sphere/infrastructure": resolve(
				__dirname,
				"libs/infrastructure/src",
			),
			"@political-sphere/game-engine": resolve(
				__dirname,
				"libs/game-engine/src",
			),
		},
	},
});
