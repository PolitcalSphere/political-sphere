#!/usr/bin/env node
import fs from "fs";
import path from "path";

const rules = {
	// Root-level allowed files (exceptions from governance)
	root: [
		"README.md",
		"LICENSE",
		"CHANGELOG.md",
		"CONTRIBUTING.md",
		"package.json",
		"pnpm-workspace.yaml",
		"nx.json",
		"tsconfig.base.json",
		".editorconfig",
		".gitignore",
		".gitattributes",
		".github/",
		".vscode/",
		".lefthook/",
		"ai-controls.json",
		"ai-metrics.json",
		"package-lock.json",
		"TODO-STEPS.md",
		"TODO.md",
	],
	// Directory mappings: pattern -> allowed directory
	directories: {
		"apps/": ["apps"],
		"libs/": ["libs"],
		"tools/": ["tools"],
		"docs/": ["docs"],
		"scripts/": ["scripts"], // Note: scripts are allowed at root per governance
		"ai/": ["ai"],
		"assets/": ["assets"],
		"reports/": ["reports"],
	},
};

function checkFilePlacement(filePath) {
	const relativePath = path.relative(process.cwd(), filePath);
	const parts = relativePath.split(path.sep);

	// Check root-level files
	if (parts.length === 1) {
		if (
			!rules.root.some(
				(pattern) =>
					relativePath === pattern || relativePath.startsWith(pattern),
			)
		) {
			return `File ${relativePath} should not be at root level. Move to appropriate subdirectory.`;
		}
		return null;
	}

	// Check root-level directories (like .github/, .vscode/)
	if (parts.length === 2 && parts[1] === "") {
		// directory
		const dirName = parts[0] + "/";
		if (
			rules.root.some(
				(pattern) => dirName === pattern || dirName.startsWith(pattern),
			)
		) {
			return null; // allowed
		}
	}

	// Check directory placement for subdirectories
	const topDir = parts[0] + "/";
	const allowedDirs = rules.directories[topDir];
	if (!allowedDirs) {
		// Allow if it's a root-allowed directory
		if (
			rules.root.some(
				(pattern) => topDir === pattern || topDir.startsWith(pattern),
			)
		) {
			return null;
		}
		return `Directory ${topDir} is not in the allowed structure. See governance for placement rules.`;
	}

	return null;
}

function main() {
	const errors = [];
	const cwd = process.cwd();

	function walk(dir) {
		const files = fs.readdirSync(dir);
		for (const file of files) {
			const fullPath = path.join(dir, file);
			const stat = fs.statSync(fullPath);
			if (stat.isDirectory()) {
				// Skip node_modules, .git, etc.
				if (!["node_modules", ".git", ".nx", "dist", "build"].includes(file)) {
					walk(fullPath);
				}
			} else {
				const error = checkFilePlacement(fullPath);
				if (error) {
					errors.push(error);
				}
			}
		}
	}

	walk(cwd);

	if (errors.length > 0) {
		console.error("Directory placement violations found:");
		for (const e of errors) {
			console.error(`- ${e}`);
		}
		console.error(
			"\nSee governance rules in .github/copilot-instructions/ for placement guidelines.",
		);
		process.exit(1);
	} else {
		console.log(
			"All files are in correct locations according to governance rules.",
		);
	}
}

main();
