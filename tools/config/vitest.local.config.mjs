import { resolve } from "node:path";

// Lightweight local Vitest config that scopes to VITEST_APP when set.
// This avoids loading the repo-level vitest.config.js while iterating.
export default {
	test: {
		globals: true,
		environment: process.env.VITEST_ENV || "node",
		testTimeout: 15000,
		include: process.env.VITEST_APP
			? [
					`apps/${process.env.VITEST_APP}/src/**/*.{test,spec}.{js,mjs,ts,tsx,jsx}`,
					`apps/${process.env.VITEST_APP}/tests/**/*.{test,spec}.{js,mjs,ts,tsx,jsx}`,
				]
			: [
					"apps/*/src/**/*.{test,spec}.{js,mjs,ts,tsx,jsx}",
					"apps/*/tests/**/*.{test,spec}.{js,mjs,ts,tsx,jsx}",
					"libs/*/src/**/*.{test,spec}.{js,mjs,ts,tsx,jsx}",
				],
		exclude: [
			"**/node_modules/**",
			"**/e2e/**",
			"**/playwright.config.js",
			"ai/**",
			"tools/**",
		],
		setupFiles: ["./scripts/test-setup.ts"],
	},
	cacheDir: ".vitest/cache-temp",
	resolve: {
		alias: {
			"@political-sphere/shared": resolve(
				process.cwd(),
				"libs/shared/cjs-shared.cjs",
			),
		},
	},
};
