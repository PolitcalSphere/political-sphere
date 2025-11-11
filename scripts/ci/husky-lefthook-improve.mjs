#!/usr/bin/env node
/**
 * Husky & Lefthook Improvement Suggester
 *
 * Analyzes the .husky and .lefthook.yml configuration and suggests:
 * - Performance optimizations
 * - Best practice improvements
 * - Modern tooling upgrades
 * - Configuration enhancements
 * - Automation opportunities
 *
 * Owner: DevOps Team
 * Last updated: 2025-10-31
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

class ImprovementSuggester {
  constructor() {
    this.suggestions = [];
    this.optimizations = [];
    this.upgrades = [];
  }

  addSuggestion(category, title, description, impact, effort, implementation = null) {
    const suggestion = { category, title, description, impact, effort, implementation };
    if (category === "performance") {
      this.optimizations.push(suggestion);
    } else if (category === "upgrade") {
      this.upgrades.push(suggestion);
    } else {
      this.suggestions.push(suggestion);
    }
  }

  async analyzeLefthookConfig() {
    const lefthookPath = path.join(ROOT_DIR, ".lefthook.yml");

    if (!fs.existsSync(lefthookPath)) {
      return;
    }

    const content = fs.readFileSync(lefthookPath, "utf8");
    const config = parseYaml(content);

    // Performance suggestions
    if (!config["pre-commit"]?.parallel) {
      this.addSuggestion(
        "performance",
        "Enable Parallel Execution",
        "Enable parallel execution for pre-commit hooks to reduce total runtime",
        "High",
        "Low",
        'Add "parallel: true" to pre-commit section in .lefthook.yml',
      );
    }

    // Check for timeout configurations
    const hooks = ["pre-commit", "commit-msg", "pre-push"];
    hooks.forEach((hook) => {
      if (config[hook]?.commands) {
        Object.entries(config[hook].commands).forEach(([name, cmd]) => {
          if (!cmd.timeout) {
            this.addSuggestion(
              "performance",
              `Add Timeout to ${name}`,
              `Add timeout configuration to prevent hanging commands`,
              "Medium",
              "Low",
              `Add "timeout: 300" to ${name} command in ${hook}`,
            );
          }
        });
      }
    });

    // Check for resource limits
    if (!config.max_processes) {
      this.addSuggestion(
        "performance",
        "Configure Process Limits",
        "Set maximum parallel processes to prevent resource exhaustion",
        "Medium",
        "Low",
        'Add "max_processes: 4" to .lefthook.yml',
      );
    }

    // Upgrade suggestions
    if (content.includes("node_modules/.bin/")) {
      this.addSuggestion(
        "upgrade",
        "Use Modern Tool Resolution",
        "Replace hardcoded node_modules/.bin paths with npx or direct commands",
        "Low",
        "Medium",
        'Replace "node_modules/.bin/eslint" with "npx eslint"',
      );
    }

    // Check for deprecated patterns
    if (content.includes("npm run")) {
      this.addSuggestion(
        "upgrade",
        "Use Direct Commands",
        'Replace "npm run" with direct tool execution for better performance',
        "Medium",
        "Medium",
        'Replace "npm run lint" with "npx eslint"',
      );
    }

    // Configuration improvements
    if (!config.colors) {
      this.addSuggestion(
        "configuration",
        "Enable Colored Output",
        "Enable colored output for better readability in CI/CD",
        "Low",
        "Low",
        'Add "colors: true" to .lefthook.yml',
      );
    }

    // Check for missing error handling
    if (!config.skip_output_on_error) {
      this.addSuggestion(
        "configuration",
        "Configure Error Output",
        "Configure error output handling for better debugging",
        "Low",
        "Low",
        'Add "skip_output_on_error: false" to .lefthook.yml',
      );
    }
  }

  async analyzeHuskyScripts() {
    const huskyDir = path.join(ROOT_DIR, ".husky");

    if (!fs.existsSync(huskyDir)) {
      return;
    }

    const hookFiles = fs.readdirSync(huskyDir);

    for (const hookFile of hookFiles) {
      const hookPath = path.join(huskyDir, hookFile);
      const stat = fs.statSync(hookPath);

      if (!stat.isFile()) continue;

      const content = fs.readFileSync(hookPath, "utf8");

      // Performance improvements
      if (content.includes("npx") && !content.includes("--no-install")) {
        this.addSuggestion(
          "performance",
          "Optimize NPX Calls",
          `Add --no-install flag to npx commands in ${hookFile} for faster execution`,
          "Medium",
          "Low",
          `Add --no-install to npx commands in ${hookPath}`,
        );
      }

      // Error handling improvements
      if (!content.includes("set -e") && !content.includes("trap")) {
        this.addSuggestion(
          "configuration",
          "Add Error Handling",
          `Add proper error handling to ${hookFile}`,
          "High",
          "Low",
          `Add "set -euo pipefail" at the beginning of ${hookPath}`,
        );
      }

      // Logging improvements
      if (!content.includes("echo") && !content.includes("printf")) {
        this.addSuggestion(
          "configuration",
          "Add Logging",
          `Add informative logging to ${hookFile} for better debugging`,
          "Low",
          "Low",
          `Add echo statements for progress indication in ${hookPath}`,
        );
      }
    }
  }

  async analyzePackageJson() {
    const packageJsonPath = path.join(ROOT_DIR, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    // Check lefthook version
    if (packageJson.dependencies?.lefthook) {
      const version = packageJson.dependencies.lefthook;
      if (version.includes("^1.6")) {
        this.addSuggestion(
          "upgrade",
          "Upgrade Lefthook",
          "Consider upgrading lefthook to latest version for new features and bug fixes",
          "Medium",
          "Low",
          "Update lefthook version in package.json",
        );
      }
    }

    // Check for missing scripts
    const usefulScripts = ["hooks:review", "hooks:security", "hooks:test", "hooks:improve"];

    const existingScripts = Object.keys(packageJson.scripts || {});
    usefulScripts.forEach((script) => {
      if (!existingScripts.includes(script)) {
        this.addSuggestion(
          "automation",
          `Add ${script} Script`,
          `Add npm script for ${script} to package.json`,
          "Low",
          "Low",
          `Add "${script}": "node scripts/ci/${script.replace("hooks:", "husky-lefthook-")}.mjs" to scripts`,
        );
      }
    });
  }

  async analyzeLintStaged() {
    const lintStagedPath = path.join(ROOT_DIR, "lint-staged.config.js");

    if (fs.existsSync(lintStagedPath)) {
      const content = fs.readFileSync(lintStagedPath, "utf8");

      // Check for performance optimizations
      if (content.includes("eslint") && !content.includes("--cache")) {
        this.addSuggestion(
          "performance",
          "Enable ESLint Caching",
          "Add --cache flag to ESLint for faster repeated runs",
          "Medium",
          "Low",
          "Add --cache flag to ESLint configuration in lint-staged",
        );
      }

      // Check for parallel processing
      if (
        !content.includes("concurrently") &&
        Object.keys(JSON.parse(content.replace("export default", "").replace(/;$/, ""))).length > 2
      ) {
        this.addSuggestion(
          "performance",
          "Parallel Linting",
          "Consider using concurrently for parallel linting of different file types",
          "High",
          "Medium",
          "Use concurrently to run linters in parallel",
        );
      }
    }
  }

  async suggestModernPractices() {
    // Check for CI integration
    const ciWorkflowsDir = path.join(ROOT_DIR, ".github/workflows");
    if (fs.existsSync(ciWorkflowsDir)) {
      const workflows = fs.readdirSync(ciWorkflowsDir);
      const hasHooksReview = workflows.some((w) => w.includes("hooks") || w.includes("review"));

      if (!hasHooksReview) {
        this.addSuggestion(
          "automation",
          "Add CI Hooks Review",
          "Add automated hooks configuration review to CI pipeline",
          "Medium",
          "Medium",
          "Create .github/workflows/hooks-review.yml workflow",
        );
      }
    }

    // Check for monitoring
    const lefthookPath = path.join(ROOT_DIR, ".lefthook.yml");
    if (fs.existsSync(lefthookPath)) {
      const content = fs.readFileSync(lefthookPath, "utf8");
      if (!content.includes("metrics") && !content.includes("otel")) {
        this.addSuggestion(
          "monitoring",
          "Add Performance Monitoring",
          "Add OpenTelemetry metrics collection for hooks performance",
          "Low",
          "High",
          "Integrate OpenTelemetry for hooks performance monitoring",
        );
      }
    }

    // Check for backup/recovery
    const huskyDir = path.join(ROOT_DIR, ".husky");
    if (fs.existsSync(huskyDir)) {
      const hasBackup = fs.readdirSync(huskyDir).some((f) => f.includes(".bak"));
      if (!hasBackup) {
        this.addSuggestion(
          "reliability",
          "Add Hook Backups",
          "Create backup copies of critical hooks for recovery",
          "Low",
          "Low",
          "Create .bak versions of critical hook scripts",
        );
      }
    }
  }

  async runImprovementAnalysis() {
    console.log("💡 Analyzing Husky & Lefthook configuration for improvements...\n");

    await this.analyzeLefthookConfig();
    await this.analyzeHuskyScripts();
    await this.analyzePackageJson();
    await this.analyzeLintStaged();
    await this.suggestModernPractices();

    return this.generateImprovementReport();
  }

  generateImprovementReport() {
    console.log("\n💡 Improvement Analysis Report");
    console.log("=".repeat(50));

    const totalSuggestions =
      this.suggestions.length + this.optimizations.length + this.upgrades.length;

    if (totalSuggestions === 0) {
      console.log("\n✅ Configuration is already well-optimized!");
    } else {
      // Performance optimizations
      if (this.optimizations.length > 0) {
        console.log(`\n⚡ PERFORMANCE OPTIMIZATIONS (${this.optimizations.length}):`);
        this.optimizations.forEach((opt) => {
          console.log(`  • ${opt.title} (${opt.impact} impact, ${opt.effort} effort)`);
          console.log(`    ${opt.description}`);
          if (opt.implementation) {
            console.log(`    Implementation: ${opt.implementation}`);
          }
          console.log("");
        });
      }

      // Upgrade suggestions
      if (this.upgrades.length > 0) {
        console.log(`\n⬆️  UPGRADE OPPORTUNITIES (${this.upgrades.length}):`);
        this.upgrades.forEach((upgrade) => {
          console.log(`  • ${upgrade.title} (${upgrade.impact} impact, ${upgrade.effort} effort)`);
          console.log(`    ${upgrade.description}`);
          if (upgrade.implementation) {
            console.log(`    Implementation: ${upgrade.implementation}`);
          }
          console.log("");
        });
      }

      // General suggestions
      if (this.suggestions.length > 0) {
        console.log(`\n💡 GENERAL IMPROVEMENTS (${this.suggestions.length}):`);
        this.suggestions.forEach((suggestion) => {
          console.log(
            `  • ${suggestion.title} (${suggestion.impact} impact, ${suggestion.effort} effort)`,
          );
          console.log(`    ${suggestion.description}`);
          if (suggestion.implementation) {
            console.log(`    Implementation: ${suggestion.implementation}`);
          }
          console.log("");
        });
      }
    }

    console.log(
      `\n📊 Summary: ${this.optimizations.length} optimizations, ${this.upgrades.length} upgrades, ${this.suggestions.length} suggestions\n`,
    );

    return totalSuggestions > 0;
  }
}

// Run improvement analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const suggester = new ImprovementSuggester();
  suggester.runImprovementAnalysis().then((hasSuggestions) => {
    process.exit(hasSuggestions ? 0 : 1);
  });
}

export default ImprovementSuggester;
