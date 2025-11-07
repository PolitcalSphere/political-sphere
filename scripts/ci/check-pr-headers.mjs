#!/usr/bin/env node
// Validate presence and basic correctness of mandatory PR headers.
// Reads PR body from env PR_BODY (GitHub Actions) or from stdin if not set.
// Emits GitHub annotations and exits 1 on blocking violations.

import { readFileSync } from "node:fs";

function getPrBody() {
	const body = process.env.PR_BODY;
	if (body && body.trim()) return body;
	try {
		return readFileSync(0, "utf8"); // stdin
	} catch {
		return "";
	}
}

function extractBlock(name, text) {
	// Escape special regex characters to prevent ReDoS
	const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const re = new RegExp(
		`(^|\n)${escapedName}:\n([\u0000-\uFFFF]*?)(\nS|$)`,
		"m",
	);
	const m = text.match(re);
	if (!m) return null;
	// group 2 contains indented lines
	return m[2].replace(/\n\S.*/, "").trim();
}

function error(msg) {
	console.log(`::error::${msg.replace(/\n/g, "%0A")}`);
}
function warn(msg) {
	console.log(`::warning::${msg.replace(/\n/g, "%0A")}`);
}
function notice(msg) {
	console.log(`::notice::${msg.replace(/\n/g, "%0A")}`);
}

function parseList(line) {
	// supports [a, b] or hyphen bullets
	const bracket = line.match(/\[(.*)\]/);
	if (bracket) {
		return bracket[1]
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return line
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.startsWith("- "))
		.map((l) => l.slice(2).trim());
}

function validateAIExecution(block) {
	const failures = [];
	if (!block) {
		failures.push("Missing AI-EXECUTION block.");
		return failures;
	}
	const mode = block.match(/\bmode:\s*(.*)/)?.[1]?.trim();
	const controlsLine = block.match(/\bcontrols:\s*(.*)/)?.[1] ?? "";
	const deferredLine = block.match(/\bdeferred:\s*(.*)/)?.[1] ?? "";
	const rationale = block.match(/\brationale:\s*(.*)/)?.[1]?.trim();
	const allowed = ["Safe", "Fast-Secure", "Audit", "R&D"];
	if (!mode || !allowed.includes(mode)) {
		failures.push(`AI-EXECUTION.mode must be one of ${allowed.join(", ")}`);
	}
	const controls = parseList(controlsLine);
	if (!controls || controls.length === 0) {
		failures.push("AI-EXECUTION.controls must list one or more control IDs.");
	}
	// deferred can be empty; no strict requirement
	if (!rationale) {
		failures.push("AI-EXECUTION.rationale is required (1–2 lines).");
	}
	return failures;
}

function validateAssumptions(block, confidenceBlock) {
	const failures = [];
	if (!block)
		failures.push("Missing ASSUMPTIONS block with at least one bullet.");
	else {
		const items = block
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l.startsWith("- "));
		if (items.length === 0)
			failures.push("ASSUMPTIONS must include at least one list item.");
	}
	if (!confidenceBlock) failures.push("Missing CONFIDENCE block.");
	else {
		const self = confidenceBlock.match(/self_estimate:\s*([0-9.]+)/)?.[1];
		const areasLine =
			confidenceBlock.match(/high_risk_areas:\s*(.*)/)?.[1] ?? "";
		const val = self ? Number(self) : NaN;
		if (!(val >= 0 && val <= 1))
			failures.push("CONFIDENCE.self_estimate must be in [0,1].");
		const areas = parseList(areasLine);
		if (!areas || areas.length === 0)
			failures.push(
				"CONFIDENCE.high_risk_areas should include at least one area.",
			);
	}
	return failures;
}

function validateOutput(block) {
	const failures = [];
	if (!block) {
		failures.push("Missing OUTPUT block.");
		return failures;
	}
	const type = block.match(/type:\s*(.*)/)?.[1]?.trim();
	const includesLine = block.match(/includes:\s*(.*)/)?.[1] ?? "";
	if (!type || type !== "unified-diff")
		failures.push('OUTPUT.type must be "unified-diff".');
	const includes = parseList(includesLine);
	if (!includes.includes("tests"))
		failures.push('OUTPUT.includes must include "tests".');
	return failures;
}

(function main() {
	const body = getPrBody();
	if (!body || !body.trim()) {
		notice("PR body not available; skipping PR headers validation.");
		process.exit(0);
	}
	const aiExec = extractBlock("AI-EXECUTION", body);
	const assumptions = extractBlock("ASSUMPTIONS", body);
	const confidence = extractBlock("CONFIDENCE", body);
	const output = extractBlock("OUTPUT", body);

	const failures = [
		...validateAIExecution(aiExec),
		...validateAssumptions(assumptions, confidence),
		...validateOutput(output),
	];

	if (failures.length) {
		failures.forEach((f) => error(f));
		console.error(
			`PR header validation failed with ${failures.length} error(s).`,
		);
		process.exit(1);
	}
	console.log("PR header validation passed.");
})();
