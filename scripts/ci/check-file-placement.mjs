#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { safeJoin, validateFilename } from "../../libs/shared/src/path-security.js";

const rules = {
  // Root-level allowed files (exceptions from governance per docs/00-foundation/organization.md)
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
    ".lefthook.yml",
    ".devcontainer/",
    ".blackboxrules",
    ".npmrc",
    ".yamllint",
    "ai-controls.json",
    "ai-metrics.json",
    "package-lock.json",
    "TODO-STEPS.md",
    "TODO.md",
    "file-structure.md",
    "tsconfig.json",
    "vitest.config.js",
    // Temporary migration artifacts (can be removed after cleanup)
    "migration-graph.html",
    "migration-complete-graph.html",
    "results.sarif",
    // Test files (should be moved but temporarily allowed)
    "test_input.json",
    "test_input2.json",
    "tsconfig 2.json",
    // Local development files (should be in .gitignore)
    ".env",
    ".env.local",
    "test-output.log",
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
    "data/": ["data"], // Data directory allowed at root
    "static/": ["static"], // Static assets allowed at root
    "coverage/": ["coverage"], // Test coverage reports
    "logs/": ["logs"], // Application logs
    "ai-cache/": ["ai-cache"], // AI cache (legacy, should move to ai/)
    "ai-index/": ["ai-index"], // AI index (legacy, should move to ai/)
    "ai-metrics/": ["ai-metrics"], // AI metrics (legacy, should move to ai/)
    ".vitest/": [".vitest"], // Vitest cache directory
  },
};

function checkFilePlacement(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const parts = relativePath.split(path.sep);

  // Ignore test database files (should be in .gitignore)
  if (relativePath.match(/^test-.*\.db(-wal|-shm)?$/)) {
    return null;
  }

  // Check root-level files
  if (parts.length === 1) {
    if (
      !rules.root.some((pattern) => relativePath === pattern || relativePath.startsWith(pattern))
    ) {
      return `File ${relativePath} should not be at root level. Move to appropriate subdirectory.`;
    }
    return null;
  }

  // Check root-level directories (like .github/, .vscode/)
  if (parts.length === 2 && parts[1] === "") {
    // directory
    const dirName = parts[0] + "/";
    if (rules.root.some((pattern) => dirName === pattern || dirName.startsWith(pattern))) {
      return null; // allowed
    }
  }

  // Check directory placement for subdirectories
  const topDir = parts[0] + "/";
  const allowedDirs = rules.directories[topDir];
  if (!allowedDirs) {
    // Allow if it's a root-allowed directory
    if (rules.root.some((pattern) => topDir === pattern || topDir.startsWith(pattern))) {
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
      try {
        const sanitizedFile = validateFilename(file);
        const fullPath = safeJoin(dir, sanitizedFile);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          // Skip node_modules, .git, etc.
          if (!["node_modules", ".git", ".nx", "dist", "build"].includes(sanitizedFile)) {
            walk(fullPath);
          }
        } else {
          const error = checkFilePlacement(fullPath);
          if (error) {
            errors.push(error);
          }
        }
      } catch (error) {}
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
    console.log("All files are in correct locations according to governance rules.");
  }
}

main();
