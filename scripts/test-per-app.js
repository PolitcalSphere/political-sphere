#!/usr/bin/env node
const { spawnSync } = require("node:child_process");

const argv = process.argv.slice(2);
let app = null;
for (const a of argv) {
	if (a.startsWith("--app=")) app = a.split("=")[1];
	else if (!a.startsWith("--") && !app) app = a;
}

if (!app) {
	console.error(
		"Usage: npm run test:per-app -- <app>    OR    npm run test:per-app --app=api",
	);
	process.exit(2);
}

// Align patterns with vitest.config.js default include (apps/*/src and apps/*/tests)
const patternSrc = `apps/${app}/src/**/*.{test,spec}.{js,mjs,ts,tsx,jsx}`;
const patternTests = `apps/${app}/tests/**/*.{test,spec}.{js,mjs,ts,tsx,jsx}`;
console.log(
	`Running tests for app: ${app} -> patterns: ${patternSrc} ${patternTests}`,
);

// Validate app name to prevent injection
if (!/^[a-zA-Z0-9_-]+$/.test(app)) {
	console.error(`Invalid app name: ${app}`);
	process.exit(2);
}

// Use shell: false for security - pass arguments as array
const res = spawnSync("npx", ["vitest", "--run"], {
	stdio: "inherit",
	shell: false,
	env: { ...process.env, VITEST_APP: app },
});
process.exit(res.status || 0);
