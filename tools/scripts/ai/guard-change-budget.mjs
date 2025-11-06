#!/usr/bin/env node
import { execFileSync } from "child_process";
import fs from "fs";

function run(cmd, args = []) {
	try {
		return execFileSync(cmd, args, { encoding: "utf8" }).trim();
	} catch {
		return "";
	}
}

function parseArgs() {
	const args = {};
	for (const a of process.argv.slice(2)) {
		if (a.startsWith("--")) {
			const [k, v] = a.slice(2).split("=");
			args[k] = v || true;
		}
	}
	return args;
}

const args = parseArgs();
const mode = (args.mode || process.env.MODE || "safe").toLowerCase();
const base = args.base || process.env.BASE_REF || "origin/main";

console.log(`guard-change-budget: mode=${mode} base=${base}`);

// Validate base parameter to prevent injection
if (!/^[a-zA-Z0-9/_.-]+$/.test(base)) {
	console.error(`Invalid base ref: ${base}`);
	process.exit(1);
}

// Ensure base exists (try to fetch minimal)
try {
	run("git", ["rev-parse", "--verify", base]) ||
		run("git", ["fetch", "origin", base, "--depth=1"]);
} catch {
	// ignore
}

// Validation protocol reminders
console.log("\nValidation Protocol Reminders:");
console.log(
	"- Run unit tests, linters, and secret scan according to the Execution Mode.",
);
console.log("- Update CHANGELOG.md and TODO.md for all changes.");
console.log(
	"- Ensure parity between .blackboxrules and .github/copilot-instructions/copilot-instructions.md",
);
console.log("- Test changes in CI pipeline.");
console.log("- Gather feedback from development team.");
console.log("\nArtefact Checklist:");
console.log("- Attach or update SBOM/provenance artefacts for the change.");
console.log(
	"- Capture test evidence (logs, screenshots, reports) when deferring gates.",
);
console.log("\nBenchmark Mapping Reminders:");
console.log(
	"- Map changes to OWASP ASVS, NIST SP 800-53, ISO/IEC 27001, WCAG 2.2 AA+, NIST AI RMF, and GDPR/CCPA as applicable.",
);
console.log("\nTelemetry Identifiers:");
console.log(
	"- Ensure automation outputs include trace or telemetry identifiers per governance playbook 2.2.0.",
);
console.log("");

const diffNumstat = run("git", ["diff", "--numstat", `${base}...HEAD`]);
const diffNameOnly = run("git", ["diff", "--name-only", `${base}...HEAD`]);

if (!diffNameOnly) {
	console.log("No changes detected between base and HEAD — nothing to check.");
	process.exit(0);
}

const changedFiles = diffNameOnly.split("\n").filter(Boolean);
let totalAdded = 0;
let totalDeleted = 0;
if (diffNumstat) {
	for (const line of diffNumstat.split("\n")) {
		const parts = line.split("\t");
		if (parts.length >= 3) {
			const added = parts[0] === "-" ? 0 : parseInt(parts[0], 10) || 0;
			const deleted = parts[1] === "-" ? 0 : parseInt(parts[1], 10) || 0;
			totalAdded += added;
			totalDeleted += deleted;
		}
	}
}
const totalChangedLines = totalAdded + totalDeleted;
const totalFilesChanged = changedFiles.length;

console.log(
	`Files changed: ${totalFilesChanged}, Lines changed (added+deleted): ${totalChangedLines}`,
);

function fail(msg) {
	console.error("\nGUARD FAILED: " + msg + "\n");
	process.exit(1);
}

function pass(msg) {
	console.log("\nGUARD PASS: " + msg + "\n");
}

// Helper: detect added dependencies in package.json
function detectNewDeps(baseRef) {
	try {
		// Validate baseRef to prevent injection
		if (!/^[a-zA-Z0-9/_.-]+$/.test(baseRef)) {
			console.error(`Invalid base ref: ${baseRef}`);
			return [];
		}
		const basePkg = run("git", ["show", `${baseRef}:package.json`]);
		const headPkg = fs.readFileSync("package.json", "utf8");
		const baseJson = JSON.parse(basePkg || "{}");
		const headJson = JSON.parse(headPkg || "{}");
		const depsBase = Object.assign(
			{},
			baseJson.dependencies || {},
			baseJson.devDependencies || {},
		);
		const depsHead = Object.assign(
			{},
			headJson.dependencies || {},
			headJson.devDependencies || {},
		);
		const newDeps = [];
		for (const k of Object.keys(depsHead)) {
			if (!depsBase[k]) newDeps.push(k);
		}
		return newDeps;
	} catch {
		// If we can't read base package.json, be conservative and return []
		return [];
	}
}

// Helper: check docs/TODO.md for deferral entry
function checkTodoDeferral() {
	try {
		const todo = fs.readFileSync("docs/TODO.md", "utf8");
		// Look for 'defer' or 'deferred' and an owner indicator (@ or Owner:) and a due date YYYY-MM-DD
		const deferPattern = /defer|deferred|deferral/i;
		const ownerPattern = /@\w+|Owner:\s*\S+/i;
		const datePattern = /\d{4}-\d{2}-\d{2}/;
		const hasDefer =
			deferPattern.test(todo) &&
			ownerPattern.test(todo) &&
			datePattern.test(todo);
		return hasDefer;
	} catch {
		return false;
	}
}

// Helper: check for SBOM/provenance/test evidence in changed files or repo
function checkAuditArtefacts() {
	const artPatterns = [
		/sbom/i,
		/provenance/i,
		/sbom\.json/i,
		/provenance\.json/i,
		/artifacts\//i,
	];
	const evidencePatterns = [
		/test-results/i,
		/screenshots?/i,
		/test-logs/i,
		/playwright-report/i,
		/cypress/i,
	];
	for (const f of changedFiles) {
		for (const p of artPatterns) if (p.test(f)) return { artefactFound: true };
		for (const p of evidencePatterns)
			if (p.test(f)) return { artefactFound: true, evidenceFound: true };
	}
	// look in repo for common artefact files
	const candidates = [
		"sbom.json",
		"provenance.json",
		"artifacts/sbom.json",
		"test-results",
		"screenshots",
	];
	for (const c of candidates) {
		if (fs.existsSync(c)) {
			return { artefactFound: true };
		}
	}
	return { artefactFound: false };
}

// Enforcement by mode
if (mode === "safe") {
	const MAX_LINES = 300;
	const MAX_FILES = 12;
	if (totalChangedLines > MAX_LINES) {
		fail(
			`Safe mode budget exceeded: ${totalChangedLines} lines changed (limit ${MAX_LINES}). Reduce changes or switch to Audit mode with justification.`,
		);
	}
	if (totalFilesChanged > MAX_FILES) {
		fail(
			`Safe mode file-change budget exceeded: ${totalFilesChanged} files changed (limit ${MAX_FILES}). Split change into smaller PRs.`,
		);
	}
	// New deps forbidden unless ADR attached: detect new deps
	const newDeps = detectNewDeps(base);
	if (newDeps.length > 0) {
		// check for ADR files in changedFiles
		const hasADR = changedFiles.some((f) => /adr|docs\/architecture/i.test(f));
		if (!hasADR) {
			fail(
				`Safe mode forbids adding new runtime/build dependencies without an ADR. Detected new deps: ${newDeps.join(", ")}. Attach an ADR or remove the dependency.`,
			);
		}
	}
	pass("Safe mode checks passed");
} else if (
	mode === "fast-secure" ||
	mode === "fast_secure" ||
	mode === "fast"
) {
	const MAX_LINES = 200;
	const MAX_FILES = 8;
	if (totalChangedLines > MAX_LINES) {
		fail(
			`Fast-Secure mode budget exceeded: ${totalChangedLines} lines changed (limit ${MAX_LINES}).`,
		);
	}
	if (totalFilesChanged > MAX_FILES) {
		fail(
			`Fast-Secure mode file-change budget exceeded: ${totalFilesChanged} files changed (limit ${MAX_FILES}).`,
		);
	}
	if (!checkTodoDeferral()) {
		fail(
			"Fast-Secure mode requires a deferral entry in docs/TODO.md with an owner and due date (YYYY-MM-DD). Please add a TODO deferral.",
		);
	}
	pass("Fast-Secure checks passed");
} else if (mode === "audit") {
	// No budget cap, but require artefacts
	const artefacts = checkAuditArtefacts();
	if (!artefacts.artefactFound) {
		fail(
			"Audit mode requires SBOM/provenance artefacts (e.g., sbom.json or provenance.json) be included in the change set or present in the repo.",
		);
	}
	// test evidence is recommended — best-effort check
	if (!artefacts.evidenceFound) {
		console.warn(
			"Audit advisory: no explicit test evidence (screenshots/logs) detected in the changed files. CI may still require additional evidence.",
		);
	}
	pass("Audit checks passed (artefacts present)");
} else if (mode === "r&d" || mode === "rd" || mode === "r_d") {
	console.log(
		"R&D mode: advisory only. Ensure PR metadata marks the change as experimental and plan a Safe re-run before merging to protected branches.",
	);
	// Write an advisory file to help reviewers (non-blocking)
	try {
		fs.writeFileSync(
			".ai-experimental",
			`experimental: true\nmode: R&D\ndate: ${new Date().toISOString()}\n`,
		);
		console.log("Wrote .ai-experimental advisory file.");
	} catch {
		// ignore
	}
	pass("R&D advisory emitted");
} else {
	console.log(`Unknown mode '${mode}', skipping budget checks.`);
	process.exit(0);
}

process.exit(0);
