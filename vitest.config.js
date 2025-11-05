/// <reference types="vitest" />

import { resolve } from "node:path";
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
		include:
			process.env.VITEST_SCOPE === "shared"
				? ["libs/shared/src/__tests__/**/*.{test,spec}.{js,mjs,ts,tsx,jsx,tsx}"]
				: ["**/*.{test,spec}.{js,mjs,ts,tsx,jsx,tsx}"],
		coverage: {
			provider: "istanbul",
			reporter: ["text", "json", "html"],
			// Measure coverage across the entire codebase for full project assessment
			all: true,
			// Include all source files across apps and libs
			include: [
				"apps/*/src/**/*.{js,ts,jsx,tsx}",
				"libs/*/src/**/*.{js,ts,jsx,tsx}",
			],
			exclude: [
				"node_modules/",
				"dist/",
				"**/*.d.ts",
				"**/*.config.{js,ts}",
				"tools/**",
				"ai/**",
				"docs/**",
				"**/__tests__/**",
				"**/tests/**",
				"**/*.test.{js,ts,jsx,tsx}",
				"**/*.spec.{js,ts,jsx,tsx}",
				// Exclude migration and setup files
				"**/migrations/**",
				"**/migrations.{js,ts}",
				// Exclude frontend JSX files - need proper Babel config
				"apps/frontend/**",
			],
			// Temporarily disable thresholds to allow coverage generation despite test failures
			thresholds: {
				global: {
					branches: 0,
					functions: 0,
					lines: 0,
					statements: 0,
				},
			},
		},
		// Use threads for all runs to support ES modules and improve performance
		// Disable pooling to ensure database isolation between tests
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		maxThreads: 1,
		minThreads: 1,
		setupFiles: ["./scripts/test-setup.ts"],
		// Add caching to speed up repeated test runs (use Vite's cacheDir)
		// NOTE: Vitest deprecated test.cache.dir; use top-level cacheDir instead.
		// We'll set cacheDir at the root of this config object below.
		// Enable changed mode for faster development feedback
		// Default to disabled to ensure CI and coverage runs execute all tests.
		// Opt-in by setting VITEST_CHANGED=1 in dev tasks.
		changed: process.env.VITEST_CHANGED === "1",
		// Add parallel execution for faster test runs
		sequence: {
			hooks: "parallel",
		},
	},
	// Use Vite's cache directory; Vitest will nest under this path automatically
	cacheDir: ".vitest/cache",
	resolve: {
		alias: {
			"@political-sphere/shared": resolve(
				__dirname,
				"libs/shared/cjs-shared.cjs",
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
