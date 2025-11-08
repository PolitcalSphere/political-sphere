#!/usr/bin/env node
/**
 * Pattern Matcher - FIXED VERSION
 * Uses string patterns (not regex objects) to survive JSON serialization
 * Based on ESLint's proven pattern matching approach
 */

const fs = require("node:fs");
const path = require("node:path");

const PATTERNS_DIR = path.join(__dirname, "../../../ai/patterns");
const COMPILED_PATTERNS = path.join(PATTERNS_DIR, "compiled-patterns.json");

class PatternMatcher {
	constructor() {
		this.patterns = this.loadPatterns();
		// Pre-compile regex objects from the loaded string patterns.
		// This avoids creating RegExp from variables repeatedly at match-time
		// and centralizes validation/try-catch for malformed patterns.
		this.compiledPatterns = this._compileRegexes(this.patterns);
	}

	_compileRegexes(patterns) {
		const out = {};
		Object.entries(patterns).forEach(([category, categoryPatterns]) => {
			out[category] = [];
			categoryPatterns.forEach(({ pattern, flags, severity, message }) => {
				try {
					if (
						typeof pattern !== "string" ||
						pattern.length === 0 ||
						pattern.length > 2000
					) {
						// skip suspiciously large or non-string patterns
						return;
					}

					// Security: Validate pattern to prevent ReDoS attacks
					// Reference: CWE-1333 Inefficient Regular Expression Complexity
					if (this._isReDoSVulnerable(pattern)) {
						console.warn(
							`Skipping potentially ReDoS-vulnerable pattern for category=${category}: ${pattern}`,
						);
						return;
					}

					// Security: Sanitize flags to prevent injection
					// Only allow safe, standard regex flags
					const sanitizedFlags = this._sanitizeFlags(flags);

					// Security: Use try-catch with timeout simulation
					// RegExp construction itself doesn't timeout, but this prevents
					// malformed patterns from crashing the application
					const regex = new RegExp(pattern, sanitizedFlags);

					// Additional safety: Test regex compilation time
					// If it takes too long, it might be vulnerable to ReDoS
					const testStart = Date.now();
					regex.test("test"); // Quick test to ensure it works
					const testDuration = Date.now() - testStart;

					if (testDuration > 100) {
						console.warn(
							`Skipping slow regex (${testDuration}ms) for category=${category}: ${pattern}`,
						);
						return;
					}

					out[category].push({ regex, severity, message });
				} catch (_) {
					// If a pattern fails to compile, skip it but log for debugging.
					console.warn(
						`Pattern compile failed for category=${category}: ${pattern}`,
					);
				}
			});
		});
		return out;
	}

	_sanitizeFlags(flags) {
		// Security: Whitelist of safe regex flags
		// Reference: MDN RegExp flags documentation
		const allowedFlags = new Set(["g", "i", "m", "s", "u", "y"]);

		if (!flags || typeof flags !== "string") {
			return "u"; // Default to unicode-aware
		}

		// Filter to only allowed flags, remove duplicates
		const sanitized = [...new Set(flags.split(""))]
			.filter((flag) => allowedFlags.has(flag))
			.join("");

		return sanitized || "u"; // Fallback to unicode flag
	}

	_isReDoSVulnerable(pattern) {
		// Security: Enhanced ReDoS detection
		// Reference: OWASP ReDoS Prevention Cheat Sheet
		// For production, consider using 'recheck' npm package: https://www.npmjs.com/package/recheck

		// 1. Check pattern length (extremely long patterns can be suspicious)
		if (pattern.length > 1000) {
			return true;
		}

		// 2. Check for nested quantifiers (major ReDoS cause)
		const nestedQuantifiers = [
			/(\*|\+|\?|\{\d+,?\d*\})\s*(\*|\+|\?|\{\d+,?\d*\})/, // consecutive quantifiers
			/\([^)]*(\*|\+)\)\s*(\*|\+)/, // grouped quantifiers
			/\([^)]*\{\d+,\}\)\s*(\*|\+)/, // unbounded range then quantifier
		];

		if (nestedQuantifiers.some((re) => re.test(pattern))) {
			return true;
		}

		// 3. Check for overlapping/ambiguous alternatives
		// Patterns like (a|a)*, (a|ab)*, etc.
		if (/\([^)]*\|[^)]*\)\s*(\*|\+)/.test(pattern)) {
			// This is a simplified check; full overlap detection is complex
			// Consider using 'recheck' library for production
			const alternatives = pattern.match(/\(([^)]+)\)/);
			if (alternatives && alternatives[1].includes("|")) {
				return true; // Potentially dangerous
			}
		}

		// 4. Check for excessive backtracking patterns
		const backtrackingPatterns = [
			/\.\*.*\.\*/, // multiple .* can cause exponential backtracking
			/\.\+.*\.\+/, // multiple .+ similar issue
		];

		if (backtrackingPatterns.some((re) => re.test(pattern))) {
			return true;
		}

		return false;
	}

	loadPatterns() {
		if (fs.existsSync(COMPILED_PATTERNS)) {
			return JSON.parse(fs.readFileSync(COMPILED_PATTERNS, "utf8"));
		}
		return this.compilePatterns();
	}

	compilePatterns() {
		// CRITICAL: Store patterns as STRINGS, not RegExp objects
		// RegExp objects serialize to {} in JSON, which match EVERYTHING
		// Convert to RegExp only at match-time
		return {
			security: [
				{
					pattern: "password\\s*=\\s*['\"][^'\"]+['\"]",
					flags: "gi",
					severity: "critical",
					message: "Hardcoded password",
				},
				{
					pattern: "api[_-]?key\\s*=\\s*['\"][^'\"]+['\"]",
					flags: "gi",
					severity: "critical",
					message: "Hardcoded API key",
				},
				{
					pattern: "secret\\s*=\\s*['\"][^'\"]+['\"]",
					flags: "gi",
					severity: "critical",
					message: "Hardcoded secret",
				},
				{
					pattern: "eval\\s*\\(",
					flags: "gi",
					severity: "critical",
					message: "eval() usage",
				},
				{
					pattern: "\\.innerHTML\\s*=",
					flags: "gi",
					severity: "high",
					message: "innerHTML (XSS risk)",
				},
			],
			quality: [
				{
					pattern: "console\\.log\\(",
					flags: "gi",
					severity: "low",
					message: "console.log found",
				},
				{
					pattern: "debugger",
					flags: "gi",
					severity: "medium",
					message: "debugger statement",
				},
				{
					pattern: "var\\s+",
					flags: "g",
					severity: "low",
					message: "Use let/const instead of var",
				},
			],
			performance: [
				{
					pattern: "for\\s*\\(.*\\.length",
					flags: "gi",
					severity: "low",
					message: "Cache .length in loop",
				},
			],
		};
	}

	savePatterns() {
		const patterns = this.compilePatterns();
		fs.mkdirSync(PATTERNS_DIR, { recursive: true });
		fs.writeFileSync(COMPILED_PATTERNS, JSON.stringify(patterns, null, 2));
		return patterns;
	}

	scanFile(filePath) {
		const content = fs.readFileSync(filePath, "utf8");
		const issues = [];

		// Use pre-compiled regex objects for matching
		Object.entries(this.compiledPatterns).forEach(([category, compiled]) => {
			compiled.forEach(({ regex, severity, message }) => {
				const matches = content.match(regex) || [];
				matches.forEach(() => {
					issues.push({ category, severity, message, file: filePath });
				});
			});
		});

		return issues;
	}

	// API compatibility for code-analyzer
	analyzeCode(code, filePath) {
		const issues = [];

		// Use pre-compiled regex objects for analyzeCode
		Object.entries(this.compiledPatterns).forEach(([category, compiled]) => {
			compiled.forEach(({ regex, severity, message }) => {
				const matches = code.match(regex) || [];
				matches.forEach(() => {
					issues.push({ category, severity, message, file: filePath });
				});
			});
		});

		return { issues, score: Math.max(0, 100 - issues.length * 5) };
	}

	scanDirectory(dirPath, options = {}) {
		const {
			extensions = [".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs"],
			exclude = ["node_modules", "dist", "build"],
		} = options;
		const results = { files: 0, issues: [] };

		const scanDir = (dir) => {
			const entries = fs.readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				if (exclude.includes(entry.name)) continue;

				const fullPath = path.join(dir, entry.name);

				if (entry.isDirectory()) {
					scanDir(fullPath);
				} else if (extensions.some((ext) => entry.name.endsWith(ext))) {
					results.files++;
					results.issues.push(...this.scanFile(fullPath));
				}
			}
		};

		scanDir(dirPath);
		return results;
	}
}

// CLI
if (require.main === module) {
	const matcher = new PatternMatcher();
	const args = process.argv.slice(2);
	const command = args[0];

	if (command === "init") {
		console.log("Compiling patterns...");
		const patterns = matcher.savePatterns();
		console.log(`✓ Saved ${Object.keys(patterns).length} pattern categories`);
	} else if (command === "scan" && args[1]) {
		const target = path.resolve(args[1]);
		const stat = fs.statSync(target);

		if (stat.isDirectory()) {
			const results = matcher.scanDirectory(target);
			console.log(
				`\nScanned ${results.files} files, found ${results.issues.length} issues:`,
			);

			const bySeverity = {};
			results.issues.forEach((issue) => {
				bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
			});

			Object.entries(bySeverity).forEach(([severity, count]) => {
				console.log(`  ${severity}: ${count}`);
			});
		} else {
			const issues = matcher.scanFile(target);
			console.log(
				`\nFound ${issues.length} issues in ${path.basename(target)}:`,
			);
			issues.forEach(({ severity, message }) => {
				console.log(`  [${severity}] ${message}`);
			});
		}
	} else {
		console.log(`
Pattern Matcher - Fixed Version

Usage:
  node pattern-matcher-fixed.cjs init              # Compile patterns
  node pattern-matcher-fixed.cjs scan <file|dir>  # Scan for issues
    `);
	}
}

module.exports = PatternMatcher;
