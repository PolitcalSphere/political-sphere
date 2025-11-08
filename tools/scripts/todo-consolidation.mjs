#!/usr/bin/env node

/**
 * TODO Consolidation Script
 * Detects and merges duplicate TODO entries across the repository
 * Prevents fragmentation of task management
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const REPO_ROOT = path.resolve(__dirname, "../../../");
const TODO_FILE = path.join(REPO_ROOT, "docs/TODO.md");
const IGNORE_PATTERNS = [
	"node_modules",
	".git",
	"dist",
	"build",
	"coverage",
	"*.log",
	"tmp",
	"cache",
];

/**
 * Find all TODO files in the repository
 */
function findTodoFiles() {
	const todoFiles = [];

	function scanDirectory(dir) {
		let items;
		try {
			items = fs.readdirSync(dir);
		} catch (error) {
			console.warn(`Warning: Cannot read directory ${dir}: ${error.message}`);
			return;
		}

		for (const item of items) {
			const fullPath = path.join(dir, item);
			const stat = fs.statSync(fullPath);

			// Skip ignored patterns
			if (
				IGNORE_PATTERNS.some((pattern) => {
					if (pattern.includes("*")) {
						// Security: Use regex with global flag to replace ALL asterisks
						// Reference: CWE-182 Incomplete Sanitization
						return item.includes(pattern.replace(/\*/g, ""));
					}
					return item === pattern;
				})
			) {
				continue;
			}

			if (stat.isDirectory()) {
				scanDirectory(fullPath);
			} else if (stat.isFile() && isTodoFile(item, fullPath)) {
				todoFiles.push(fullPath);
			}
		}
	}

	scanDirectory(REPO_ROOT);
	return todoFiles;
}

/**
 * Check if file is a TODO file
 */
function isTodoFile(filename, filepath) {
	const todoPatterns = [/^todo/i, /todo-/i, /-todo/i, /todo_/i, /_todo/i];

	// Check filename
	if (todoPatterns.some((pattern) => pattern.test(filename))) {
		return true;
	}

	// Check file extension
	if (path.extname(filename) === ".md") {
		try {
			const content = fs.readFileSync(filepath, "utf8");
			// Check if file contains TODO markers
			return (
				content.includes("# TODO") ||
				content.includes("- [ ]") ||
				content.includes("TODO:")
			);
		} catch (error) {
			return false;
		}
	}

	return false;
}

/**
 * Parse TODO entries from a file
 */
function parseTodoEntries(filepath) {
	const content = fs.readFileSync(filepath, "utf8");
	const entries = [];
	const lines = content.split("\n");

	let currentEntry = null;
	let inCodeBlock = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Skip code blocks
		if (line.trim().startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			continue;
		}
		if (inCodeBlock) continue;

		// Check for TODO markers
		const todoMatch = line.match(/^(\s*)- \[([ x])\]\s*(.+)$/);
		if (todoMatch) {
			if (currentEntry) {
				entries.push(currentEntry);
			}

			currentEntry = {
				text: todoMatch[3].trim(),
				completed: todoMatch[2] === "x",
				file: path.relative(REPO_ROOT, filepath),
				line: i + 1,
				context: [],
			};
		} else if (
			currentEntry &&
			line.trim().startsWith("-") &&
			!line.includes("[ ]") &&
			!line.includes("[x]")
		) {
			// Continuation of current entry
			currentEntry.context.push(line.trim().substring(1).trim());
		} else if (line.trim() === "" && currentEntry) {
			// End of entry
			entries.push(currentEntry);
			currentEntry = null;
		}
	}

	if (currentEntry) {
		entries.push(currentEntry);
	}

	return entries;
}

/**
 * Find duplicate TODO entries
 */
function findDuplicates(entries) {
	const duplicates = [];
	const seen = new Map();

	for (const entry of entries) {
		const key = normalizeText(entry.text);

		if (seen.has(key)) {
			const existing = seen.get(key);
			duplicates.push({
				original: existing,
				duplicate: entry,
			});
		} else {
			seen.set(key, entry);
		}
	}

	return duplicates;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text) {
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Generate consolidation report
 */
function generateReport(allEntries, duplicates, todoFiles) {
	const report = {
		summary: {
			totalFiles: todoFiles.length,
			totalEntries: allEntries.length,
			duplicateEntries: duplicates.length,
			uniqueEntries: allEntries.length - duplicates.length,
		},
		files: todoFiles.map((f) => path.relative(REPO_ROOT, f)),
		duplicates: duplicates.map((d) => ({
			text: d.original.text,
			files: [
				`${d.original.file}:${d.original.line}`,
				`${d.duplicate.file}:${d.duplicate.line}`,
			],
		})),
		recommendations: [],
	};

	// Generate recommendations
	if (duplicates.length > 0) {
		report.recommendations.push(
			"Found duplicate TODO entries. Consider consolidating them in docs/TODO.md",
		);
	}

	if (todoFiles.length > 1) {
		report.recommendations.push(
			"Multiple TODO files detected. Consider consolidating into docs/TODO.md",
		);
	}

	return report;
}

/**
 * Main execution
 */
function main() {
	console.log("🔍 Scanning for TODO files...");

	const todoFiles = findTodoFiles();
	console.log(`📁 Found ${todoFiles.length} TODO files`);

	const allEntries = [];
	for (const file of todoFiles) {
		const entries = parseTodoEntries(file);
		allEntries.push(...entries);
		console.log(
			`📝 ${path.relative(REPO_ROOT, file)}: ${entries.length} entries`,
		);
	}

	console.log(`📊 Total TODO entries: ${allEntries.length}`);

	const duplicates = findDuplicates(allEntries);
	console.log(`🔄 Duplicate entries: ${duplicates.length}`);

	const report = generateReport(allEntries, duplicates, todoFiles);

	// Output report
	console.log("\n📋 Consolidation Report:");
	console.log(`   Files scanned: ${report.summary.totalFiles}`);
	console.log(`   Total entries: ${report.summary.totalEntries}`);
	console.log(`   Unique entries: ${report.summary.uniqueEntries}`);
	console.log(`   Duplicates: ${report.summary.duplicateEntries}`);

	if (report.duplicates.length > 0) {
		console.log("\n⚠️  Duplicates found:");
		report.duplicates.forEach((dup, index) => {
			console.log(`   ${index + 1}. "${dup.text}"`);
			console.log(`      Files: ${dup.files.join(", ")}`);
		});
	}

	if (report.recommendations.length > 0) {
		console.log("\n💡 Recommendations:");
		report.recommendations.forEach((rec) => console.log(`   • ${rec}`));
	}

	// Save detailed report
	const reportPath = path.join(
		REPO_ROOT,
		"reports/todo-consolidation-report.json",
	);
	try {
		fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
		console.log(
			`\n📄 Detailed report saved to: ${path.relative(REPO_ROOT, reportPath)}`,
		);
	} catch (error) {
		console.warn(
			`Warning: Could not save report to ${reportPath}: ${error.message}`,
		);
	}

	// Exit with error code if issues found
	if (duplicates.length > 0 || todoFiles.length > 1) {
		console.log("\n❌ Issues detected. Run consolidation manually.");
		process.exit(1);
	} else {
		console.log("\n✅ No consolidation issues found.");
	}
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export { findDuplicates, findTodoFiles, generateReport, parseTodoEntries };
