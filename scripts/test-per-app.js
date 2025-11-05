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

// Use a shell invocation so the glob pattern is passed in the same way npm scripts do
// Prefer scoping through VITEST_APP for reliable discovery via vitest.config.js
const cmd = `VITEST_APP=${app} npx vitest --run`;
const res = spawnSync(cmd, { stdio: "inherit", shell: true });
process.exit(res.status || 0);
