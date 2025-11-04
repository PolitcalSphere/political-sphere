#!/usr/bin/env node
// Programmatic Vitest runner that reliably enables coverage and writes a ranked JSON
// This uses Vitest's Node API so we avoid CLI flag/reporting inconsistencies.
import fs from "fs";
import path from "path";

console.log(
	"Running Vitest (programmatic runner) to produce coverage artifacts...",
);

async function main() {
	// Prefer using the Vitest CLI for a single-run coverage report which reliably
	// creates `coverage/coverage-final.json`. Using the Node API can sometimes
	// start in watch/dev mode depending on config; spawning the CLI is more
	// deterministic for one-off coverage collection.
	const coveragePath = path.resolve(
		process.cwd(),
		"coverage",
		"coverage-final.json",
	);

	// If a coverage file already exists (from a targeted run), skip spawning
	// the full test suite and parse the existing file instead. This lets
	// callers produce coverage with a targeted run and then use this tool to
	// assemble the ranked report without re-running tests.
	let exitCode = 0;
	if (!fs.existsSync(coveragePath)) {
		const { spawnSync } = await import("child_process");
		const cli = process.platform === "win32" ? "npx.cmd" : "npx";
		console.log("Spawning Vitest CLI to run tests and collect coverage...");
		const result = spawnSync(cli, ["vitest", "--run", "--coverage"], {
			stdio: "inherit",
			shell: false,
		});
		exitCode = result.status;
	} else {
		console.log(
			"Found existing coverage file at",
			coveragePath,
			"- skipping test run",
		);
	}

	// Normalize Vitest return value to a numeric exit code. Some versions
	// return a number, others return an object. Be defensive and coerce to 0/1.
	let numericExit;
	if (typeof exitCode === "number") {
		numericExit = exitCode;
	} else if (exitCode && typeof exitCode === "object") {
		// If the API returned an object, try common fields, otherwise treat
		// a truthy return as success.
		if (typeof exitCode.code === "number") numericExit = exitCode.code;
		else if (typeof exitCode.status === "number") numericExit = exitCode.status;
		else if (typeof exitCode.success === "boolean")
			numericExit = exitCode.success ? 0 : 1;
		else numericExit = 0;
	} else {
		numericExit = exitCode ? 0 : 1;
	}

	// After run completes, look for coverage JSON. Vitest may write the file
	// asynchronously; poll for a short window before failing. `coveragePath`
	// was computed above so reuse the same variable.
	const waitForCoverage = (filePath, timeoutMs = 10000, intervalMs = 200) =>
		new Promise((resolve) => {
			const start = Date.now();
			const iv = setInterval(() => {
				if (fs.existsSync(filePath)) {
					clearInterval(iv);
					resolve(true);
				} else if (Date.now() - start > timeoutMs) {
					clearInterval(iv);
					resolve(false);
				}
			}, intervalMs);
		});

	const found = await waitForCoverage(coveragePath, 10_000);
	if (!found) {
		console.error("No coverage file found at", coveragePath);
		// Exit with the normalized Vitest exit code (or 1 if it was falsy)
		process.exit(typeof numericExit === "number" ? numericExit : 1);
	}

	console.log("Found coverage file:", coveragePath);
	const raw = fs.readFileSync(coveragePath, "utf8");
	let data;
	try {
		data = JSON.parse(raw);
	} catch (err) {
		console.error("Failed to parse coverage JSON:", err);
		process.exit(1);
	}

	// Build a ranked list of files by statements coverage
	const files = Object.keys(data).map((file) => {
		const metrics = data[file];
		const stm = metrics.s || {};
		const total = Object.keys(stm).length;
		const covered = Object.values(stm).filter((v) => v > 0).length;
		const pct = total === 0 ? 100 : Math.round((covered / total) * 10000) / 100;
		return { file, total, covered, pct };
	});

	files.sort((a, b) => a.pct - b.pct);

	const outPath = path.resolve(
		process.cwd(),
		"reports",
		"coverage-ranked.json",
	);
	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	fs.writeFileSync(outPath, JSON.stringify(files, null, 2));
	console.log("Wrote ranked coverage to", outPath);
	// Exit using the normalized exit code so CI/test wrappers can observe
	// the original test result.
	process.exit(typeof numericExit === "number" ? numericExit : 0);
}

main().catch((err) => {
	console.error("Runner failed:", err);
	process.exit(2);
});
