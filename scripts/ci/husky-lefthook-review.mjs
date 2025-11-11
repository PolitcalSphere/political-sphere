#!/usr/bin/env node
/**
 * Husky & Lefthook Configuration Review Script
 *
 * Reviews the .husky and .lefthook.yml configuration for:
 * - Code structure and readability
 * - Configuration completeness
 * - Best practices compliance
 * - Performance considerations
 * - Maintainability
 *
 * Owner: Platform Engineering
 * Last updated: 2025-10-31
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import { safeJoin, validateFilename } from "../../libs/shared/src/path-security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

class HooksReviewer {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
  }

  addIssue(severity, message, file = null, line = null) {
    const issue = { severity, message, file, line };
    if (severity === "error") {
      this.issues.push(issue);
    } else if (severity === "warning") {
      this.warnings.push(issue);
    } else {
      this.suggestions.push(issue);
    }
  }

  async reviewLefthookConfig() {
    const lefthookPath = path.join(ROOT_DIR, ".lefthook.yml");

    if (!fs.existsSync(lefthookPath)) {
      this.addIssue("error", ".lefthook.yml configuration file is missing");
      return;
    }

    try {
      const content = fs.readFileSync(lefthookPath, "utf8");
      const config = parseYaml(content);

      // Check for required sections
      if (!config["pre-commit"]) {
        this.addIssue("error", "pre-commit section is missing from .lefthook.yml");
      }

      if (!config["commit-msg"]) {
        this.addIssue("warning", "commit-msg section is missing from .lefthook.yml");
      }

      // Check parallel execution
      if (config["pre-commit"] && config["pre-commit"].parallel !== true) {
        this.addIssue("suggestion", "Consider enabling parallel execution for pre-commit hooks");
      }

      // Check for timeout configurations
      const hooks = ["pre-commit", "commit-msg", "pre-push"];
      hooks.forEach((hook) => {
        if (config[hook] && config[hook].commands) {
          Object.entries(config[hook].commands).forEach(([name, cmd]) => {
            if (!cmd.timeout) {
              this.addIssue(
                "warning",
                `Command '${name}' in ${hook} has no timeout configured`,
                lefthookPath,
              );
            }
          });
        }
      });

      // Check for proper error handling
      if (config["pre-commit"] && config["pre-commit"].commands) {
        Object.entries(config["pre-commit"].commands).forEach(([name, cmd]) => {
          if (!cmd.run) {
            this.addIssue("error", `Command '${name}' has no run configuration`, lefthookPath);
          }
        });
      }
    } catch (error) {
      this.addIssue("error", `Failed to parse .lefthook.yml: ${error.message}`, lefthookPath);
    }
  }

  async reviewHuskyScripts() {
    const huskyDir = path.join(ROOT_DIR, ".husky");

    if (!fs.existsSync(huskyDir)) {
      this.addIssue("error", ".husky directory is missing");
      return;
    }

    const requiredHooks = ["pre-commit", "commit-msg", "pre-push"];
    const existingHooks = fs.readdirSync(huskyDir);

    // Check for required hooks
    requiredHooks.forEach((hook) => {
      if (!existingHooks.includes(hook)) {
        this.addIssue("warning", `Required hook '${hook}' is missing from .husky`);
      }
    });

    // Review each hook script
    existingHooks.forEach((hook) => {
      try {
        const sanitizedHook = validateFilename(hook);
        const hookPath = safeJoin(huskyDir, sanitizedHook);
        const stat = fs.statSync(hookPath);

        if (!stat.isFile()) return;

        const content = fs.readFileSync(hookPath, "utf8");

        // Check for executable permissions
        if (!(stat.mode & 0o111)) {
          this.addIssue("error", `Hook '${hook}' is not executable`, hookPath);
        }

        // Check for shebang
        if (!content.startsWith("#!/")) {
          this.addIssue("error", `Hook '${hook}' is missing shebang`, hookPath);
        }

        // Check for lefthook integration
        if (!content.includes("call_lefthook")) {
          this.addIssue(
            "warning",
            `Hook '${hook}' may not be properly integrated with lefthook`,
            hookPath,
          );
        }

        // Check for error handling
        if (!content.includes("set -e") && !content.includes("set -eu")) {
          this.addIssue("warning", `Hook '${hook}' lacks proper error handling`, hookPath);
        }
      } catch (error) {
        // Skip hooks that fail validation
        return;
      }
    });
  }

  async reviewIntegration() {
    // Check package.json scripts
    const packageJsonPath = path.join(ROOT_DIR, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      if (!packageJson.scripts || !packageJson.scripts.prepare) {
        this.addIssue("warning", "package.json prepare script not configured for lefthook");
      } else if (!packageJson.scripts.prepare.includes("lefthook")) {
        this.addIssue("warning", "package.json prepare script does not install lefthook");
      }
    }

    // Check for lint-staged configuration
    const lintStagedPath = path.join(ROOT_DIR, "lint-staged.config.js");
    if (fs.existsSync(lintStagedPath)) {
      const content = fs.readFileSync(lintStagedPath, "utf8");

      if (!content.includes("eslint") || !content.includes("prettier")) {
        this.addIssue("warning", "lint-staged configuration may be incomplete");
      }
    }
  }

  async reviewPerformance() {
    const lefthookPath = path.join(ROOT_DIR, ".lefthook.yml");

    if (fs.existsSync(lefthookPath)) {
      const content = fs.readFileSync(lefthookPath, "utf8");

      // Check for parallel execution
      if (!content.includes("parallel: true")) {
        this.addIssue("suggestion", "Enable parallel execution to improve performance");
      }

      // Check command count
      const commandMatches = content.match(/run:/g);
      if (commandMatches && commandMatches.length > 10) {
        this.addIssue("warning", "High number of commands may impact performance");
      }
    }
  }

  async runReview() {
    console.log("🔍 Reviewing Husky & Lefthook configuration...\n");

    await this.reviewLefthookConfig();
    await this.reviewHuskyScripts();
    await this.reviewIntegration();
    await this.reviewPerformance();

    return this.generateReport();
  }

  generateReport() {
    console.log("\n📋 Husky & Lefthook Review Report");
    console.log("=".repeat(50));

    if (this.issues.length > 0) {
      console.log("\n❌ ISSUES:");
      this.issues.forEach((issue) => {
        const location = issue.file ? ` (${issue.file}${issue.line ? `:${issue.line}` : ""})` : "";
        console.log(`  • ${issue.message}${location}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log("\n⚠️  WARNINGS:");
      this.warnings.forEach((warning) => {
        const location = warning.file
          ? ` (${warning.file}${warning.line ? `:${warning.line}` : ""})`
          : "";
        console.log(`  • ${warning.message}${location}`);
      });
    }

    if (this.suggestions.length > 0) {
      console.log("\n💡 SUGGESTIONS:");
      this.suggestions.forEach((suggestion) => {
        const location = suggestion.file
          ? ` (${suggestion.file}${suggestion.line ? `:${suggestion.line}` : ""})`
          : "";
        console.log(`  • ${suggestion.message}${location}`);
      });
    }

    const totalIssues = this.issues.length + this.warnings.length + this.suggestions.length;

    if (totalIssues === 0) {
      console.log("\n✅ No issues found! Configuration looks good.");
    }

    console.log(
      `\n📊 Summary: ${this.issues.length} issues, ${this.warnings.length} warnings, ${this.suggestions.length} suggestions\n`,
    );

    return this.issues.length === 0;
  }
}

// Run review if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const reviewer = new HooksReviewer();
  reviewer.runReview().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export default HooksReviewer;
