#!/usr/bin/env node
/**
 * Husky & Lefthook Bug Detector
 *
 * Detects potential bugs, runtime errors, and edge cases in:
 * - Hook script logic and error handling
 * - Configuration syntax and validation
 * - Command execution and failure scenarios
 * - Edge cases in file processing
 * - Race conditions and timing issues
 *
 * Owner: QA Team
 * Last updated: 2025-10-31
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

class BugDetector {
  constructor() {
    this.bugs = [];
    this.warnings = [];
    this.edgeCases = [];
  }

  addBug(severity, title, description, file = null, line = null, suggestion = null) {
    const bug = { severity, title, description, file, line, suggestion };
    if (severity === "error" || severity === "critical") {
      this.bugs.push(bug);
    } else if (severity === "warning") {
      this.warnings.push(bug);
    } else {
      this.edgeCases.push(bug);
    }
  }

  async analyzeLefthookConfig() {
    const lefthookPath = path.join(ROOT_DIR, ".lefthook.yml");

    if (!fs.existsSync(lefthookPath)) {
      this.addBug("error", "Missing Configuration", ".lefthook.yml file not found");
      return;
    }

    try {
      const content = fs.readFileSync(lefthookPath, "utf8");
      const config = parseYaml(content);

      // Check for syntax errors
      if (!config || typeof config !== "object") {
        this.addBug("error", "Invalid YAML Structure", "Configuration is not a valid object");
        return;
      }

      // Check hook definitions
      const hooks = ["pre-commit", "commit-msg", "pre-push"];
      hooks.forEach((hook) => {
        if (config[hook]) {
          const hookConfig = config[hook];

          // Check for missing commands
          if (!hookConfig.commands && !hookConfig.scripts) {
            this.addBug(
              "error",
              `Empty Hook Definition`,
              `${hook} hook has no commands defined`,
              lefthookPath,
            );
          }

          // Check command structure
          if (hookConfig.commands) {
            Object.entries(hookConfig.commands).forEach(([name, cmd]) => {
              if (!cmd.run) {
                this.addBug(
                  "error",
                  "Missing Run Command",
                  `Command '${name}' in ${hook} has no run property`,
                  lefthookPath,
                );
              }

              // Check for potential command failures
              if (cmd.run && typeof cmd.run === "string") {
                const runCmd = cmd.run;

                // Check for commands that might fail silently
                if (runCmd.includes("&&") && !runCmd.includes("set -e")) {
                  this.addBug(
                    "warning",
                    "Potential Silent Failure",
                    `Command chain may fail silently without proper error handling`,
                    lefthookPath,
                  );
                }

                // Check for missing error checking
                if (runCmd.includes("npm") && !runCmd.includes("||")) {
                  this.addBug(
                    "warning",
                    "Missing Error Handling",
                    `NPM command may fail without error checking`,
                    lefthookPath,
                  );
                }
              }
            });
          }
        }
      });

      // Check for parallel execution issues
      if (config["pre-commit"] && config["pre-commit"].parallel) {
        const commands = config["pre-commit"].commands || {};
        const cmdNames = Object.keys(commands);

        // Check for commands that might conflict when running in parallel
        const fileModifyingCommands = cmdNames.filter((name) => {
          const cmd = commands[name];
          return (
            cmd.run &&
            (cmd.run.includes("prettier") ||
              cmd.run.includes("eslint --fix") ||
              cmd.run.includes("sed") ||
              cmd.run.includes("awk"))
          );
        });

        if (fileModifyingCommands.length > 1) {
          this.addBug(
            "warning",
            "Parallel File Modification Risk",
            "Multiple commands modifying files in parallel may cause conflicts",
            lefthookPath,
          );
        }
      }
    } catch (error) {
      this.addBug(
        "error",
        "YAML Parse Error",
        `Failed to parse .lefthook.yml: ${error.message}`,
        lefthookPath,
      );
    }
  }

  async analyzeHuskyScripts() {
    const huskyDir = path.join(ROOT_DIR, ".husky");

    if (!fs.existsSync(huskyDir)) {
      this.addBug("error", "Missing Husky Directory", ".husky directory not found");
      return;
    }

    const hookFiles = fs.readdirSync(huskyDir);

    for (const hookFile of hookFiles) {
      const hookPath = path.join(huskyDir, hookFile);
      const stat = fs.statSync(hookPath);

      if (!stat.isFile()) continue;

      const content = fs.readFileSync(hookPath, "utf8");
      const lines = content.split("\n");

      // Check for syntax errors
      let braceCount = 0;
      let parenCount = 0;
      let bracketCount = 0;

      lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Check braces, parentheses, brackets
        braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        parenCount += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
        bracketCount += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;

        // Check for unterminated strings
        const quoteCount = (line.match(/"/g) || []).length + (line.match(/'/g) || []).length;
        if (quoteCount % 2 !== 0 && !line.includes("#")) {
          this.addBug(
            "error",
            "Unterminated String",
            "String literal appears to be unterminated",
            hookPath,
            lineNum,
          );
        }

        // Check for undefined variables
        if (
          line.includes("$") &&
          !line.includes("${") &&
          !line.includes("$HOME") &&
          !line.includes("$PWD")
        ) {
          const varMatch = line.match(/\$([A-Za-z_][A-Za-z0-9_]*)/);
          if (varMatch && !lines.some((l) => l.includes(`${varMatch[1]}=`))) {
            this.addBug(
              "warning",
              "Undefined Variable",
              `Variable $${varMatch[1]} may not be defined`,
              hookPath,
              lineNum,
            );
          }
        }

        // Check for command not found errors
        if (line.includes("call_lefthook") && !content.includes("function call_lefthook")) {
          this.addBug(
            "error",
            "Missing Function Definition",
            "call_lefthook function is called but not defined",
            hookPath,
            lineNum,
          );
        }
      });

      // Check for unbalanced brackets at end of file
      if (braceCount !== 0) {
        this.addBug(
          "error",
          "Unbalanced Braces",
          `File has unbalanced braces: ${braceCount}`,
          hookPath,
        );
      }
      if (parenCount !== 0) {
        this.addBug(
          "error",
          "Unbalanced Parentheses",
          `File has unbalanced parentheses: ${parenCount}`,
          hookPath,
        );
      }
      if (bracketCount !== 0) {
        this.addBug(
          "error",
          "Unbalanced Brackets",
          `File has unbalanced brackets: ${bracketCount}`,
          hookPath,
        );
      }

      // Check for missing error handling
      const hasErrorHandling = lines.some(
        (line) =>
          line.includes("set -e") || line.includes("trap") || line.includes("if [ $? -ne 0 ]"),
      );
      if (!hasErrorHandling && lines.length > 5) {
        this.addBug(
          "warning",
          "Missing Error Handling",
          "Script lacks proper error handling mechanisms",
          hookPath,
        );
      }
    }
  }

  async detectEdgeCases() {
    // Check for empty staged files scenarios
    const lefthookPath = path.join(ROOT_DIR, ".lefthook.yml");
    if (fs.existsSync(lefthookPath)) {
      const content = fs.readFileSync(lefthookPath, "utf8");

      if (content.includes("staged_files") || content.includes("git diff")) {
        // Check if commands handle empty file lists
        if (
          !content.includes('if [ -z "$staged_files" ]') &&
          !content.includes("if [ ${#staged_files[@]} -eq 0 ]")
        ) {
          this.addBug(
            "warning",
            "Empty File List Handling",
            "Commands using staged_files may fail when no files are staged",
            lefthookPath,
          );
        }
      }
    }

    // Check for race conditions in parallel execution
    if (fs.existsSync(lefthookPath)) {
      const content = fs.readFileSync(lefthookPath, "utf8");
      if (content.includes("parallel: true")) {
        this.addBug(
          "warning",
          "Race Condition Risk",
          "Parallel execution may cause race conditions with file modifications",
          lefthookPath,
          null,
          "Consider sequential execution for file-modifying commands",
        );
      }
    }

    // Check for timeout issues
    const huskyDir = path.join(ROOT_DIR, ".husky");
    if (fs.existsSync(huskyDir)) {
      const hookFiles = fs.readdirSync(huskyDir);
      for (const hookFile of hookFiles) {
        const hookPath = path.join(huskyDir, hookFile);
        if (fs.statSync(hookPath).isFile()) {
          const content = fs.readFileSync(hookPath, "utf8");
          if (content.includes("sleep") || content.includes("timeout")) {
            this.addBug(
              "warning",
              "Timeout Handling",
              "Script contains timing-dependent operations that may cause issues",
              hookPath,
            );
          }
        }
      }
    }

    // Check for platform-specific issues
    const lefthookPath2 = path.join(ROOT_DIR, ".lefthook.yml");
    if (fs.existsSync(lefthookPath2)) {
      const content = fs.readFileSync(lefthookPath2, "utf8");
      if (content.includes("node_modules/.bin/")) {
        this.addBug(
          "warning",
          "Platform-Specific Paths",
          "Hardcoded node_modules paths may not work on all platforms",
          lefthookPath2,
        );
      }
    }
  }

  async detectLogicErrors() {
    // Check for contradictory configurations
    const lefthookPath = path.join(ROOT_DIR, ".lefthook.yml");
    if (fs.existsSync(lefthookPath)) {
      const content = fs.readFileSync(lefthookPath, "utf8");

      // Check for both parallel and sequential configurations
      if (content.includes("parallel: true") && content.includes("parallel: false")) {
        this.addBug(
          "error",
          "Conflicting Configuration",
          "Configuration has both parallel and sequential settings",
          lefthookPath,
        );
      }

      // Check for duplicate command names
      const lines = content.split("\n");
      const commandNames = [];
      let inCommands = false;

      lines.forEach((line, index) => {
        if (line.includes("commands:")) {
          inCommands = true;
        } else if (inCommands && line.match(/^\s*[a-zA-Z_][a-zA-Z0-9_]*:/)) {
          const match = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*):/);
          if (match) {
            const cmdName = match[1];
            if (commandNames.includes(cmdName)) {
              this.addBug(
                "error",
                "Duplicate Command Name",
                `Command '${cmdName}' is defined multiple times`,
                lefthookPath,
                index + 1,
              );
            }
            commandNames.push(cmdName);
          }
        } else if (line.match(/^[a-zA-Z_]/) && !line.includes(":")) {
          inCommands = false;
        }
      });
    }
  }

  async runBugDetection() {
    console.log("🐛 Detecting bugs and edge cases in Husky & Lefthook configuration...\n");

    await this.analyzeLefthookConfig();
    await this.analyzeHuskyScripts();
    await this.detectEdgeCases();
    await this.detectLogicErrors();

    return this.generateBugReport();
  }

  generateBugReport() {
    console.log("\n🐛 Bug Detection Report");
    console.log("=".repeat(50));

    if (this.bugs.length === 0 && this.warnings.length === 0 && this.edgeCases.length === 0) {
      console.log("\n✅ No bugs or issues detected!");
    } else {
      console.log(
        `\n🚨 ERRORS: ${this.bugs.length} | WARNINGS: ${this.warnings.length} | EDGE CASES: ${this.edgeCases.length}\n`,
      );

      // Report errors first
      if (this.bugs.length > 0) {
        console.log("❌ ERRORS:");
        this.bugs.forEach((bug) => {
          console.log(`  • ${bug.title}: ${bug.description}`);
          if (bug.file) {
            const location = bug.line ? `${bug.file}:${bug.line}` : bug.file;
            console.log(`    Location: ${location}`);
          }
          if (bug.suggestion) {
            console.log(`    Suggestion: ${bug.suggestion}`);
          }
          console.log("");
        });
      }

      // Report warnings
      if (this.warnings.length > 0) {
        console.log("⚠️  WARNINGS:");
        this.warnings.forEach((warning) => {
          console.log(`  • ${warning.title}: ${warning.description}`);
          if (warning.file) {
            const location = warning.line ? `${warning.file}:${warning.line}` : warning.file;
            console.log(`    Location: ${warning.file}:${warning.line}`);
          }
          if (warning.suggestion) {
            console.log(`    Suggestion: ${warning.suggestion}`);
          }
          console.log("");
        });
      }

      // Report edge cases
      if (this.edgeCases.length > 0) {
        console.log("🔍 EDGE CASES:");
        this.edgeCases.forEach((edgeCase) => {
          console.log(`  • ${edgeCase.title}: ${edgeCase.description}`);
          if (edgeCase.file) {
            const location = edgeCase.line ? `${edgeCase.file}:${edgeCase.line}` : edgeCase.file;
            console.log(`    Location: ${location}`);
          }
          if (edgeCase.suggestion) {
            console.log(`    Suggestion: ${edgeCase.suggestion}`);
          }
          console.log("");
        });
      }
    }

    const hasErrors = this.bugs.some((b) => b.severity === "error" || b.severity === "critical");
    return !hasErrors;
  }
}

// Run bug detection if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const detector = new BugDetector();
  detector.runBugDetection().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export default BugDetector;
