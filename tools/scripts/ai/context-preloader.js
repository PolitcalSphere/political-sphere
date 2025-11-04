#!/usr/bin/env node
/*
  Context Preloader: Load common development contexts for fast AI warm-up
  Usage: node scripts/ai/context-preloader.js preload
*/

import {
	existsSync,
	readdirSync,
	readFileSync,
 	statSync,
 	writeFileSync,
 	mkdirSync,
} from "fs";
import { extname, join } from "path";

// Prefer repository-root `ai-cache/`, fall back to `ai/ai-cache/` if present or needed.
const ROOT_CACHE_DIR = "ai-cache";
const FALLBACK_CACHE_DIR = join("ai", "ai-cache");

let CACHE_DIR = ROOT_CACHE_DIR;

// Always prefer the repository-root `ai-cache`. Create it if missing.
try {
	if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
} catch (err) {
	console.warn("Warning: failed to create root cache dir at", CACHE_DIR, "- falling back to ai/ai-cache:", err?.message);
	// Fall back to `ai/ai-cache` if root creation fails for any reason.
	if (!existsSync(FALLBACK_CACHE_DIR)) mkdirSync(FALLBACK_CACHE_DIR, { recursive: true });
	CACHE_DIR = FALLBACK_CACHE_DIR;
}

const CACHE_FILE = join(CACHE_DIR, "context-cache.json");
const CONTEXTS = {
	"api-routes": [
		"apps/api/src/routes/",
		"libs/shared/src/",
		"docs/architecture/decisions/",
		".blackboxrules",
	],
	"frontend-components": [
		"apps/frontend/src/components/",
		"libs/shared/src/",
		"docs/architecture/decisions/",
		".blackboxrules",
	],
	tests: ["tests/", "jest.config.cjs", "docs/", ".blackboxrules"],
	config: [
		"package.json",
		"tsconfig.base.json",
		"nx.json",
		"docs/architecture/decisions/",
		".blackboxrules",
	],
	docs: ["docs/", "README.md", ".blackboxrules"],
	"rules-awareness": [
		".blackboxrules",
		".github/copilot-instructions.md",
		"docs/architecture/decisions/",
	],
	patterns: ["ai/patterns/", "ai-learning/patterns.json", "docs/TODO.md"],
};

/**
 * Recursively walk a directory and return full file paths.
 * Uses sync APIs for simplicity and predictable ordering.
 */
function walkDir(dir) {
	const results = [];

	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch (err) {
		console.warn(`Warning: unable to read directory ${dir}: ${err?.message}`);
		return results;
	}

	for (const entry of entries) {
		const res = join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...walkDir(res));
		} else if (entry.isFile()) {
			results.push(res);
		}
	}

	return results;
}

async function preloadContext(contextName) {
	const paths = CONTEXTS[contextName];
	if (!paths) return null;

	const context = {
		name: contextName,
		files: {},
		lastUpdated: new Date().toISOString(),
	};

	const promises = paths.map(async (path) => {
		if (existsSync(path)) {
			if (statSync(path).isDirectory()) {
				const files = walkDir(path);
				for (const fullPath of files) {
					const ext = extname(fullPath);
					if (ext === ".ts" || ext === ".js" || ext === ".json" || ext === ".md") {
						try {
							const content = readFileSync(fullPath, "utf8");
							// Validate content integrity
							if (content.length === 0) {
								console.warn(`Warning: Empty file ${fullPath}`);
								continue;
							}
							context.files[fullPath] = {
								content: content.slice(0, 1000),
								size: content.length,
							};
						} catch (err) {
							console.error(`Error reading file ${fullPath}:`, err?.message);
							// Skip unreadable files but log the error
						}
					}
				}
			} else {
				try {
					const content = readFileSync(path, "utf8");
					if (content.length === 0) {
						console.warn(`Warning: Empty file ${path}`);
						return;
					}
					context.files[path] = {
						content: content.slice(0, 1000),
						size: content.length,
					};
				} catch (e) {
					console.error(`Error reading file ${path}:`, e.message);
					// Skip unreadable files but log the error
				}
			}
		} else {
			// Skip non-existent paths silently to avoid noise
			return;
		}
	});

	await Promise.all(promises);

	return context;
}

async function preloadAll() {
	const cache = { contexts: {}, lastUpdated: new Date().toISOString() };

	const promises = Object.keys(CONTEXTS).map(async (contextName) => {
		console.log(`Preloading context: ${contextName}`);
		const context = await preloadContext(contextName);
		if (context) cache.contexts[contextName] = context;
	});

	await Promise.all(promises);

	writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
	console.log(
		`Context cache built with ${Object.keys(cache.contexts).length} contexts`,
	);
}

function getContext(contextName) {
	if (!existsSync(CACHE_FILE)) {
		console.error('Cache not found. Run "preload" first.');
		process.exit(1);
	}

	const cache = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
	const context = cache.contexts[contextName];
	if (!context) {
		// Do not exit with error code for non-existent contexts — callers/tests expect graceful handling.
		console.log(`Context "${contextName}" not found.`);
		return;
	}

	console.log(JSON.stringify(context, null, 2));
}

const command = process.argv[2];
if (command === "preload") {
	preloadAll().catch(console.error);
} else if (command === "get") {
	getContext(process.argv[3]);
} else {
	console.log(
		"Usage: node scripts/ai/context-preloader.js preload|get <context>",
	);
}
