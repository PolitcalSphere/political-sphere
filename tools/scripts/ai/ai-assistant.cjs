#!/usr/bin/env node
/**
 * AI Development Assistant - Unified Super System
 * Orchestrates all AI capabilities for unprecedented development value
 * Ultra-fast, intelligent, context-aware code assistance
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
	validateFilename,
	safeJoin,
} = require("../../../libs/shared/src/path-security");

// Import all AI systems
const ExpertKnowledge = require("./expert-knowledge.cjs");
const PatternMatcher = require("./pattern-matcher.cjs");
const CodeAnalyzer = require("./code-analyzer.cjs");
const AIHub = require("./ai-hub.cjs");

const ROOT = path.join(__dirname, "../../..");
const WORKSPACE_CACHE_PRIMARY = path.join(
	ROOT,
	"ai-cache/workspace-state.json",
);
const WORKSPACE_CACHE_LEGACY = path.join(
	ROOT,
	"ai/ai-cache/workspace-state.json",
);

function resolveWorkspaceCache() {
	try {
		fs.mkdirSync(path.dirname(WORKSPACE_CACHE_PRIMARY), { recursive: true });
		return WORKSPACE_CACHE_PRIMARY;
	} catch (error) {
		console.warn(
			`AI assistant: unable to initialise ${WORKSPACE_CACHE_PRIMARY}, falling back to ${WORKSPACE_CACHE_LEGACY} (${error.message})`,
		);
		fs.mkdirSync(path.dirname(WORKSPACE_CACHE_LEGACY), { recursive: true });
		return WORKSPACE_CACHE_LEGACY;
	}
}

const WORKSPACE_CACHE = resolveWorkspaceCache();

class AIAssistant {
	constructor() {
		this.hub = new AIHub();
		this.expert = this.hub.expert;
		this.analyzer = this.hub.analyzer;
		this.patterns = this.hub.patterns;
		this.workspaceState = this.loadWorkspaceState();
		this.sessionMetrics = {
			queries: 0,
			cacheHits: 0,
			analyses: 0,
			suggestions: 0,
		};
	}

	loadWorkspaceState() {
		if (fs.existsSync(WORKSPACE_CACHE)) {
			return JSON.parse(fs.readFileSync(WORKSPACE_CACHE, "utf8"));
		}
		return this.buildWorkspaceState();
	}

	buildWorkspaceState() {
		const state = {
			timestamp: Date.now(),
			git: this.getGitState(),
			files: this.getFileMetrics(),
			tests: this.getTestState(),
			errors: this.getRecentErrors(),
			todos: this.extractTodos(),
			dependencies: this.getDependencyInfo(),
		};

		fs.mkdirSync(path.dirname(WORKSPACE_CACHE), { recursive: true });
		fs.writeFileSync(WORKSPACE_CACHE, JSON.stringify(state, null, 2));
		return state;
	}

	getGitState() {
		try {
			return {
				branch: execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT })
					.toString()
					.trim(),
				uncommitted: execSync("git status --short", { cwd: ROOT })
					.toString()
					.trim()
					.split("\n").length,
				lastCommit: execSync('git log -1 --pretty=format:"%h %s"', {
					cwd: ROOT,
				})
					.toString()
					.trim(),
			};
		} catch {
			return { branch: "unknown", uncommitted: 0, lastCommit: "N/A" };
		}
	}

	getFileMetrics() {
		const extensions = { ".ts": 0, ".tsx": 0, ".js": 0, ".jsx": 0 };
		const walk = (dir, depth = 0) => {
			if (depth > 4) return;
			try {
				fs.readdirSync(dir).forEach((file) => {
					// Validate filename to prevent path traversal
					const sanitizedFile = validateFilename(file);
					const full = safeJoin(dir, sanitizedFile);
					const stat = fs.statSync(full);
					if (
						stat.isDirectory() &&
						!sanitizedFile.startsWith(".") &&
						sanitizedFile !== "node_modules"
					) {
						walk(full, depth + 1);
					} else if (stat.isFile()) {
						const ext = path.extname(sanitizedFile);
						if (ext in extensions) extensions[ext]++;
					}
				});
			} catch {}
		};
		walk(path.join(ROOT, "apps"));
		walk(path.join(ROOT, "libs"));
		return extensions;
	}

	getTestState() {
		try {
			const testFiles = execSync(
				'find apps libs -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l',
				{ cwd: ROOT },
			)
				.toString()
				.trim();
			return { testFiles: parseInt(testFiles) || 0 };
		} catch {
			return { testFiles: 0 };
		}
	}

	getRecentErrors() {
		const errors = [];
		const logDirs = ["logs", "tools/logs", ".nx/cache"];
		logDirs.forEach((dir) => {
			const logPath = path.join(ROOT, dir);
			if (fs.existsSync(logPath)) {
				try {
					const files = fs
						.readdirSync(logPath)
						.filter((f) => f.includes("error") || f.includes("fail"))
						.slice(-3);
					errors.push(...files.map((f) => ({ file: path.join(dir, f) })));
				} catch {}
			}
		});
		return errors.slice(-5);
	}

	extractTodos() {
		const todoFile = path.join(ROOT, "docs/TODO.md");
		if (!fs.existsSync(todoFile)) return [];

		const content = fs.readFileSync(todoFile, "utf8");
		const incomplete = content.match(/- \[ \] .+/g) || [];
		return incomplete.slice(0, 10).map((t) => t.replace("- [ ] ", ""));
	}

	getDependencyInfo() {
		try {
			const pkg = JSON.parse(
				fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
			);
			return {
				dependencies: Object.keys(pkg.dependencies || {}).length,
				devDependencies: Object.keys(pkg.devDependencies || {}).length,
			};
		} catch {
			return { dependencies: 0, devDependencies: 0 };
		}
	}

	/**
	 * MAIN INTELLIGENCE INTERFACE
	 * Handles any development question/task with full context
	 */
	async assist(request, options = {}) {
		this.sessionMetrics.queries++;
		const startTime = Date.now();

		// Parse request intent
		const intent = this.parseIntent(request);

		// Route to specialized handler with full context
		let response;
		switch (intent.type) {
			case "analyze":
				response = await this.handleAnalysis(intent, options);
				break;
			case "fix":
				response = await this.handleFix(intent, options);
				break;
			case "optimize":
				response = await this.handleOptimize(intent, options);
				break;
			case "test":
				response = await this.handleTest(intent, options);
				break;
			case "refactor":
				response = await this.handleRefactor(intent, options);
				break;
			case "learn":
				response = await this.handleLearn(intent, options);
				break;
			default:
				response = await this.hub.query(request, options);
		}

		response.assistTime = Date.now() - startTime;
		response.sessionMetrics = this.sessionMetrics;
		return response;
	}

	parseIntent(request) {
		const lower = request.toLowerCase();

		// Analysis requests
		if (lower.match(/analyze|check|review|audit|inspect/)) {
			return { type: "analyze", request, focus: this.extractFocus(request) };
		}

		// Fix/debug requests
		if (lower.match(/fix|debug|solve|error|broken|failing/)) {
			return {
				type: "fix",
				request,
				errorType: this.extractErrorType(request),
			};
		}

		// Optimization requests
		if (lower.match(/optimize|improve|faster|performance|slow/)) {
			return { type: "optimize", request, target: this.extractTarget(request) };
		}

		// Testing requests
		if (lower.match(/test|spec|coverage|e2e/)) {
			return { type: "test", request, testType: this.extractTestType(request) };
		}

		// Refactoring requests
		if (lower.match(/refactor|restructure|reorganize|clean/)) {
			return { type: "refactor", request, scope: this.extractScope(request) };
		}

		// Learning requests
		if (lower.match(/how|what|why|explain|learn|understand/)) {
			return { type: "learn", request, topic: this.extractTopic(request) };
		}

		return { type: "general", request };
	}

	extractFocus(request) {
		if (request.includes("security")) return "security";
		if (request.includes("performance")) return "performance";
		if (request.includes("accessibility")) return "accessibility";
		return "general";
	}

	extractErrorType(request) {
		const errors = [
			"ENOENT",
			"EADDRINUSE",
			"MODULE_NOT_FOUND",
			"syntax",
			"type",
			"reference",
		];
		for (const err of errors) {
			if (request.toLowerCase().includes(err.toLowerCase())) return err;
		}
		return "unknown";
	}

	extractTarget(request) {
		if (request.includes("database") || request.includes("query"))
			return "database";
		if (request.includes("api") || request.includes("endpoint")) return "api";
		if (request.includes("ui") || request.includes("render")) return "ui";
		return "general";
	}

	extractTestType(request) {
		if (request.includes("unit")) return "unit";
		if (request.includes("integration")) return "integration";
		if (request.includes("e2e")) return "e2e";
		return "all";
	}

	extractScope(request) {
		if (request.includes("file")) return "file";
		if (request.includes("module") || request.includes("package"))
			return "module";
		if (request.includes("project")) return "project";
		return "auto";
	}

	extractTopic(request) {
		const topics = [
			"architecture",
			"security",
			"performance",
			"testing",
			"deployment",
		];
		for (const topic of topics) {
			if (request.toLowerCase().includes(topic)) return topic;
		}
		return "general";
	}

	async handleAnalysis(intent, options) {
		this.sessionMetrics.analyses++;

		const results = {
			type: "comprehensive-analysis",
			focus: intent.focus,
			workspace: this.workspaceState,
			recommendations: [],
		};

		// Run focused analysis
		if (options.file) {
			results.fileAnalysis = this.analyzer.analyzeFile(options.file);
			results.recommendations.push(
				...this.generateRecommendations(results.fileAnalysis),
			);
		} else if (options.directory) {
			results.directoryAnalysis = this.analyzer.analyzeDirectory(
				options.directory,
			);
			results.recommendations.push(
				...this.generateDirectoryRecommendations(results.directoryAnalysis),
			);
		}

		// Add workspace insights
		results.workspaceInsights = this.generateWorkspaceInsights();

		// Add expert recommendations
		results.expertAdvice = this.expert.search(intent.focus);

		return results;
	}

	async handleFix(intent, options) {
		const results = {
			type: "fix-assistance",
			errorType: intent.errorType,
			solutions: [],
			quickFixes: [],
		};

		// Get solution from expert knowledge
		const solution = this.expert.getSolution(intent.errorType);
		if (solution) {
			results.solutions.push(solution);
		}

		// Get quick fixes
		const debugFixes = this.expert.getQuickFix("debugging", "all");
		results.quickFixes.push(
			...(Array.isArray(debugFixes) ? debugFixes : [debugFixes]).filter(
				Boolean,
			),
		);

		// Analyze error context
		if (options.code || options.file) {
			const code = options.code || fs.readFileSync(options.file, "utf8");
			const quickAnalysis = this.analyzer.quickAnalysis(code, {
				query: intent.request,
			});
			results.codeIssues = quickAnalysis.issues;
			results.safe = quickAnalysis.safe;
		}

		// Check recent errors
		results.recentErrors = this.workspaceState.errors;

		return results;
	}

	async handleOptimize(intent, options) {
		const results = {
			type: "optimization-guidance",
			target: intent.target,
			opportunities: [],
			benchmarks: {},
		};

		// Get performance patterns
		const perfPattern = this.expert.getPattern("performance");
		if (perfPattern) {
			results.patterns = perfPattern;
		}

		// Analyze code for performance issues
		if (options.file) {
			const analysis = this.analyzer.analyzeFile(options.file);
			const perfIssues = analysis.analysis.issues.filter(
				(i) => i.category === "performance",
			);
			results.opportunities.push(...perfIssues);
			results.currentScore = analysis.analysis.score;
		}

		// Add quick performance fixes
		results.quickFixes = this.expert.getQuickFix("performance", "all") || [];

		return results;
	}

	async handleTest(intent, options) {
		const results = {
			type: "test-assistance",
			testType: intent.testType,
			coverage: this.workspaceState.tests,
			recommendations: [],
		};

		// Get testing patterns
		const testPattern = this.expert.getPattern("testing");
		if (testPattern) {
			results.patterns = testPattern;
		}

		// Get testing best practices
		results.bestPractices = this.expert.getBestPractice("code");

		// Analyze file for test coverage
		if (options.file) {
			const analysis = this.analyzer.analyzeFile(options.file);
			results.hasTests = analysis.semantic.functions?.some(
				(f) => f.includes("test") || f.includes("describe"),
			);
			if (!results.hasTests) {
				results.recommendations.push({
					priority: "high",
					message: "No tests found - add test coverage",
					pattern: testPattern,
				});
			}
		}

		return results;
	}

	async handleRefactor(intent, options) {
		const results = {
			type: "refactor-guidance",
			scope: intent.scope,
			suggestions: [],
			patterns: [],
		};

		// Get architectural patterns
		const archPattern = this.expert.getPattern("architecture");
		if (archPattern) {
			results.patterns.push(archPattern);
		}

		// Analyze code structure
		if (options.file) {
			const analysis = this.analyzer.analyzeFile(options.file);

			// Check for code smells
			analysis.analysis.suggestions.forEach((suggestion) => {
				results.suggestions.push({
					type: "improvement",
					message: suggestion.message,
					priority: "medium",
				});
			});

			// Check complexity
			if (analysis.semantic.complexity === "high") {
				results.suggestions.push({
					type: "complexity",
					message:
						"High complexity detected - consider breaking into smaller functions",
					priority: "high",
				});
			}
		}

		return results;
	}

	async handleLearn(intent, options) {
		const results = {
			type: "learning-assistance",
			topic: intent.topic,
			explanation: null,
			examples: [],
			resources: [],
		};

		// Search expert knowledge
		const knowledge = this.expert.search(intent.request);
		results.explanation = knowledge.slice(0, 3);

		// Get relevant patterns
		if (intent.topic !== "general") {
			const pattern = this.expert.getPattern(intent.topic);
			if (pattern) {
				results.examples.push(pattern);
			}
		}

		// Get project-specific info
		results.projectContext = this.expert.getProjectInfo();

		return results;
	}

	generateRecommendations(fileAnalysis) {
		const recs = [];

		if (fileAnalysis.analysis.score < 70) {
			recs.push({
				priority: "high",
				message: `Code quality score is ${fileAnalysis.analysis.score}/100 - needs improvement`,
				actions: [
					"Review critical issues",
					"Refactor problematic sections",
					"Add tests",
				],
			});
		}

		fileAnalysis.analysis.issues
			.filter((i) => i.severity === "critical")
			.forEach((issue) => {
				recs.push({
					priority: "critical",
					message: issue.message,
					category: issue.category,
					lines: issue.lines,
				});
			});

		return recs;
	}

	generateDirectoryRecommendations(dirAnalysis) {
		const recs = [];

		if (dirAnalysis.averageScore < 75) {
			recs.push({
				priority: "high",
				message: `Directory average score: ${dirAnalysis.averageScore}/100`,
				actions: [
					"Focus on lowest scoring files",
					"Establish quality baseline",
				],
			});
		}

		if (dirAnalysis.criticalIssues > 0) {
			recs.push({
				priority: "critical",
				message: `${dirAnalysis.criticalIssues} critical issues found across ${dirAnalysis.totalFiles} files`,
				actions: [
					"Fix security issues immediately",
					"Review top issue patterns",
				],
			});
		}

		return recs;
	}

	generateWorkspaceInsights() {
		const insights = [];

		if (this.workspaceState.git.uncommitted > 10) {
			insights.push({
				type: "git",
				message: `${this.workspaceState.git.uncommitted} uncommitted changes - consider committing`,
			});
		}

		if (this.workspaceState.errors.length > 0) {
			insights.push({
				type: "errors",
				message: `${this.workspaceState.errors.length} recent error logs found`,
				files: this.workspaceState.errors,
			});
		}

		const testRatio =
			this.workspaceState.tests.testFiles /
			Object.values(this.workspaceState.files).reduce((a, b) => a + b, 0);
		if (testRatio < 0.3) {
			insights.push({
				type: "testing",
				message: "Low test coverage - consider adding more tests",
				currentRatio: `${(testRatio * 100).toFixed(1)}%`,
			});
		}

		return insights;
	}

	/**
	 * Auto-improve workspace
	 */
	async autoImprove(options = {}) {
		const improvements = [];
		const startTime = Date.now();

		// 1. Analyze all code
		console.log("🔍 Analyzing workspace...");
		const dirs = ["apps", "libs"].filter((d) =>
			fs.existsSync(path.join(ROOT, d)),
		);

		for (const dir of dirs) {
			const analysis = this.analyzer.analyzeDirectory(path.join(ROOT, dir));

			// Fix critical issues
			if (analysis.criticalIssues > 0) {
				improvements.push({
					type: "critical-fixes",
					directory: dir,
					count: analysis.criticalIssues,
					action: "Manual review required",
				});
			}

			// Low scoring files
			const lowScoreFiles = analysis.fileScores.filter((f) => f.score < 60);
			if (lowScoreFiles.length > 0) {
				improvements.push({
					type: "quality-improvement",
					directory: dir,
					files: lowScoreFiles.slice(0, 5),
					action: "Refactor recommended",
				});
			}
		}

		// 2. Update workspace state
		this.workspaceState = this.buildWorkspaceState();

		// 3. Learn from patterns
		console.log("🧠 Learning from codebase patterns...");
		// This would train the expert knowledge system

		return {
			improvements,
			duration: Date.now() - startTime,
			message: `Found ${improvements.length} improvement opportunities`,
		};
	}

	/**
	 * Interactive mode
	 */
	startInteractive() {
		console.log("\n🤖 AI Development Assistant - Interactive Mode");
		console.log('Type your questions or "exit" to quit\n');

		const readline = require("readline");
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: "> ",
		});

		rl.prompt();

		rl.on("line", async (line) => {
			const input = line.trim();

			if (input === "exit" || input === "quit") {
				console.log("\n👋 Session metrics:", this.sessionMetrics);
				rl.close();
				return;
			}

			if (!input) {
				rl.prompt();
				return;
			}

			try {
				const response = await this.assist(input);
				console.log("\n" + JSON.stringify(response, null, 2) + "\n");
			} catch (error) {
				console.error("Error:", error.message);
			}

			rl.prompt();
		});
	}
}

// CLI
if (require.main === module) {
	const assistant = new AIAssistant();
	const command = process.argv[2];

	switch (command) {
		case "assist": {
			const question = process.argv.slice(3).join(" ");
			assistant.assist(question).then((result) => {
				console.log(JSON.stringify(result, null, 2));
			});
			break;
		}
		case "analyze": {
			const target = process.argv[3];
			assistant.assist("analyze code", { file: target }).then((result) => {
				console.log(JSON.stringify(result, null, 2));
			});
			break;
		}
		case "auto-improve": {
			assistant.autoImprove().then((result) => {
				console.log(JSON.stringify(result, null, 2));
			});
			break;
		}
		case "interactive":
		case "i": {
			assistant.startInteractive();
			break;
		}
		case "status": {
			console.log("Workspace State:", assistant.workspaceState);
			console.log("\nMetrics:", assistant.sessionMetrics);
			console.log("\nHub Stats:", assistant.hub.getStats());
			break;
		}
		default:
			console.log("🤖 AI Development Assistant - Super System");
			console.log("\nCommands:");
			console.log("  assist <question>     - Ask anything");
			console.log("  analyze <file>        - Deep code analysis");
			console.log("  auto-improve          - Scan & suggest improvements");
			console.log("  interactive | i       - Interactive chat mode");
			console.log("  status                - Show workspace state");
			console.log("\nExamples:");
			console.log('  npm run ai "fix ENOENT error"');
			console.log('  npm run ai "optimize performance"');
			console.log('  npm run ai "how to test async functions"');
	}
}

module.exports = AIAssistant;
