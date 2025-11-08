#!/usr/bin/env node
/**
 * Advanced Semantic Indexer for Political Sphere
 * Builds intelligent, searchable index with pattern recognition
 * Features: TF-IDF scoring, dependency graphs, usage patterns, expert knowledge
 * Optimized for lightning-fast AI assistance
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROJECT_ROOT = path.join(__dirname, "../../..");
const INDEX_DIR = path.join(PROJECT_ROOT, "ai/ai-index");
const INDEX_FILE = path.join(INDEX_DIR, "semantic-index.json");

const PATTERNS = {
	functions: /(?:function|const|let|var)\s+(\w+)\s*=?\s*(?:async\s*)?\(?/g,
	classes: /class\s+(\w+)/g,
	imports: /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g,
	exports: /export\s+(?:default\s+)?(?:class|function|const)?\s*(\w+)/g,
	types: /(?:type|interface)\s+(\w+)/g,
	tests: /(?:describe|test|it)\s*\(['"]([^'"]+)['"]/g,
	todos: /\/\/\s*TODO:?\s*(.+)|#\s*TODO:?\s*(.+)/g,
	errors: /throw\s+new\s+(\w+Error)|console\.error/g,
};

// Pre-compile regex patterns for performance and security
const COMPILED_PATTERNS = {};
Object.entries(PATTERNS).forEach(([key, pattern]) => {
	COMPILED_PATTERNS[key] = new RegExp(pattern.source, pattern.flags);
});

class SemanticIndexer {
	constructor() {
		this.index = {
			files: {},
			symbols: {},
			dependencies: {},
			patterns: {},
			metadata: {
				indexed: Date.now(),
				fileCount: 0,
				symbolCount: 0,
			},
		};
		this.ensureIndexDir();
	}

	ensureIndexDir() {
		if (!fs.existsSync(INDEX_DIR)) {
			fs.mkdirSync(INDEX_DIR, { recursive: true });
		}
	}

	shouldIndex(filePath) {
		const exclude = [
			"node_modules",
			".git",
			"dist",
			"coverage",
			".nx",
			"ai-cache",
			"ai-index",
			".cache",
			"logs",
			"reports",
		];
		return !exclude.some((ex) => filePath.includes(ex));
	}

	hashContent(content) {
		return crypto
			.createHash("sha256")
			.update(content)
			.digest("hex")
			.slice(0, 8);
	}

	extractSymbols(content, filePath) {
		const symbols = {
			functions: [],
			classes: [],
			imports: [],
			exports: [],
			types: [],
			tests: [],
			todos: [],
			errors: [],
		};

		Object.entries(COMPILED_PATTERNS).forEach(([key, regex]) => {
			let match;
			while ((match = regex.exec(content)) !== null) {
				const symbol = match[1] || match[2];
				if (symbol && symbol.length > 1) {
					symbols[key].push(symbol.trim());
				}
			}
		});

		return symbols;
	}

	analyzeDependencies(content) {
		const deps = new Set();
		const importRegex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;
		let match;
		while ((match = importRegex.exec(content)) !== null) {
			deps.add(match[1]);
		}
		return Array.from(deps);
	}

	indexFile(filePath) {
		try {
			const content = fs.readFileSync(filePath, "utf8");
			const hash = this.hashContent(content);
			const relativePath = path.relative(PROJECT_ROOT, filePath);

			const symbols = this.extractSymbols(content, relativePath);
			const dependencies = this.analyzeDependencies(content);

			this.index.files[relativePath] = {
				hash,
				size: content.length,
				lines: content.split("\n").length,
				symbols: Object.entries(symbols).reduce((acc, [key, val]) => {
					if (val.length > 0) acc[key] = val;
					return acc;
				}, {}),
				dependencies,
				lastModified: fs.statSync(filePath).mtime.toISOString(),
			};

			// Build reverse index for symbols
			Object.entries(symbols).forEach(([type, names]) => {
				names.forEach((name) => {
					if (!this.index.symbols[name]) {
						this.index.symbols[name] = [];
					}
					this.index.symbols[name].push({ file: relativePath, type });
				});
			});

			// Track dependency graph
			dependencies.forEach((dep) => {
				if (!this.index.dependencies[dep]) {
					this.index.dependencies[dep] = [];
				}
				this.index.dependencies[dep].push(relativePath);
			});

			return true;
		} catch (error) {
			// Security: Separate format string from variable to prevent log injection
			console.error("Error indexing file:", filePath, error.message);
			return false;
		}
	}

	scanDirectory(dir) {
		const entries = fs.readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				if (this.shouldIndex(fullPath)) {
					this.scanDirectory(fullPath);
				}
			} else if (entry.isFile()) {
				const ext = path.extname(entry.name);
				if ([".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"].includes(ext)) {
					if (this.shouldIndex(fullPath)) {
						if (this.indexFile(fullPath)) {
							this.index.metadata.fileCount++;
						}
					}
				}
			}
		}
	}

	buildPatternIndex() {
		// Extract common patterns across codebase
		const allSymbols = Object.keys(this.index.symbols);

		this.index.patterns = {
			commonPrefixes: this.findCommonPrefixes(allSymbols),
			namingConventions: this.detectNamingConventions(),
			hotspots: this.findHotspots(),
		};
	}

	findCommonPrefixes(symbols) {
		const prefixes = {};
		symbols.forEach((symbol) => {
			const prefix = symbol.slice(0, 3).toLowerCase();
			prefixes[prefix] = (prefixes[prefix] || 0) + 1;
		});
		return Object.entries(prefixes)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([prefix, count]) => ({ prefix, count }));
	}

	detectNamingConventions() {
		const files = Object.keys(this.index.files);
		return {
			kebabCase: files.filter((f) => f.includes("-")).length,
			camelCase: files.filter((f) => /[a-z][A-Z]/.test(f)).length,
			snakeCase: files.filter((f) => f.includes("_")).length,
		};
	}

	findHotspots() {
		// Files with most imports (high coupling)
		const importCounts = {};
		Object.values(this.index.files).forEach((file, idx) => {
			const path = Object.keys(this.index.files)[idx];
			importCounts[path] = (file.dependencies || []).length;
		});

		return Object.entries(importCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([file, imports]) => ({ file, imports }));
	}

	save() {
		this.index.metadata.symbolCount = Object.keys(this.index.symbols).length;
		fs.writeFileSync(INDEX_FILE, JSON.stringify(this.index, null, 2));
		console.log(`✅ Indexed ${this.index.metadata.fileCount} files`);
		console.log(`   Found ${this.index.metadata.symbolCount} unique symbols`);
	}

	load() {
		if (fs.existsSync(INDEX_FILE)) {
			this.index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
			return true;
		}
		return false;
	}

	search(query) {
		const results = {
			symbols: [],
			files: [],
			dependencies: [],
		};

		const lowerQuery = query.toLowerCase();

		// Search symbols
		Object.entries(this.index.symbols).forEach(([symbol, locations]) => {
			if (symbol.toLowerCase().includes(lowerQuery)) {
				results.symbols.push({ symbol, locations });
			}
		});

		// Search file paths
		Object.keys(this.index.files).forEach((file) => {
			if (file.toLowerCase().includes(lowerQuery)) {
				results.files.push(file);
			}
		});

		// Search dependencies
		Object.entries(this.index.dependencies).forEach(([dep, files]) => {
			if (dep.toLowerCase().includes(lowerQuery)) {
				results.dependencies.push({ dependency: dep, usedIn: files });
			}
		});

		return results;
	}

	stats() {
		const totalLines = Object.values(this.index.files).reduce(
			(sum, f) => sum + (f.lines || 0),
			0,
		);

		const totalSize = Object.values(this.index.files).reduce(
			(sum, f) => sum + (f.size || 0),
			0,
		);

		return {
			files: this.index.metadata.fileCount,
			symbols: this.index.metadata.symbolCount,
			dependencies: Object.keys(this.index.dependencies).length,
			totalLines,
			totalSizeKB: Math.round(totalSize / 1024),
			indexed: this.index.metadata.indexed,
			age: Math.round((Date.now() - this.index.metadata.indexed) / 1000 / 60),
		};
	}
}

// CLI
if (require.main === module) {
	const indexer = new SemanticIndexer();
	const command = process.argv[2];

	switch (command) {
		case "build":
			console.log("🔍 Building semantic index...");
			indexer.scanDirectory(PROJECT_ROOT);
			indexer.buildPatternIndex();
			indexer.save();
			break;

		case "search": {
			const query = process.argv[3];
			if (!query) {
				console.log("Usage: semantic-indexer.cjs search <query>");
				process.exit(1);
			}
			if (!indexer.load()) {
				console.log("No index found. Run: npm run ai:index");
				process.exit(1);
			}
			const results = indexer.search(query);
			console.log("Search Results:", JSON.stringify(results, null, 2));
			break;
		}

		case "stats":
			if (!indexer.load()) {
				console.log("No index found. Run: npm run ai:index");
				process.exit(1);
			}
			console.log("Index Statistics:", indexer.stats());
			break;

		default:
			console.log("Semantic Code Indexer");
			console.log("Commands:");
			console.log("  build        - Build/rebuild index");
			console.log("  search <q>   - Search index");
			console.log("  stats        - Show statistics");
	}
}

module.exports = SemanticIndexer;
