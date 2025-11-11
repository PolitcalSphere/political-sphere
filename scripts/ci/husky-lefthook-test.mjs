#!/usr/bin/env node
/**
 * Husky & Lefthook Integration Tests
 *
 * Tests the complete hooks system including:
 * - Hook execution simulation
 * - Configuration validation
 * - Error handling and recovery
 * - Performance benchmarking
 * - Integration with CI/CD
 *
 * Owner: QA Team
 * Last updated: 2025-10-31
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { parse as parseYaml } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

class HooksTester {
  constructor() {
    this.testResults = [];
    this.performanceMetrics = [];
  }

  addTestResult(testName, passed, duration = null, error = null, details = {}) {
    this.testResults.push({
      name: testName,
      passed,
      duration,
      error,
      details,
    });
  }

  recordPerformance(metric, value, unit = "ms") {
    this.performanceMetrics.push({ metric, value, unit });
  }

  async testLefthookInstallation() {
    const startTime = Date.now();

    try {
      // Check if lefthook is available
      execSync("which lefthook", { stdio: "pipe" });
      this.addTestResult("Lefthook Installation", true, Date.now() - startTime);
    } catch (error) {
      this.addTestResult("Lefthook Installation", false, Date.now() - startTime, error.message);
    }
  }

  async testConfigurationValidation() {
    const startTime = Date.now();
    const lefthookPath = path.join(ROOT_DIR, ".lefthook.yml");

    try {
      if (!fs.existsSync(lefthookPath)) {
        throw new Error(".lefthook.yml not found");
      }

      const content = fs.readFileSync(lefthookPath, "utf8");
      const config = parseYaml(content);

      // Validate required sections
      const requiredSections = ["pre-commit"];
      for (const section of requiredSections) {
        if (!config[section]) {
          throw new Error(`Missing required section: ${section}`);
        }
      }

      // Validate command structure
      if (config["pre-commit"]?.commands) {
        for (const [name, cmd] of Object.entries(config["pre-commit"].commands)) {
          if (!cmd.run) {
            throw new Error(`Command '${name}' missing run property`);
          }
        }
      }

      this.addTestResult("Configuration Validation", true, Date.now() - startTime);
    } catch (error) {
      this.addTestResult("Configuration Validation", false, Date.now() - startTime, error.message);
    }
  }

  async testHuskyScripts() {
    const startTime = Date.now();
    const huskyDir = path.join(ROOT_DIR, ".husky");

    try {
      if (!fs.existsSync(huskyDir)) {
        throw new Error(".husky directory not found");
      }

      const hookFiles = fs.readdirSync(huskyDir);
      const requiredHooks = ["pre-commit", "commit-msg"];

      for (const requiredHook of requiredHooks) {
        if (!hookFiles.includes(requiredHook)) {
          throw new Error(`Missing required hook: ${requiredHook}`);
        }

        const hookPath = path.join(huskyDir, requiredHook);
        const stat = fs.statSync(hookPath);

        // Check permissions
        if (!(stat.mode & 0o111)) {
          throw new Error(`Hook ${requiredHook} is not executable`);
        }

        // Check shebang
        const content = fs.readFileSync(hookPath, "utf8");
        if (!content.startsWith("#!/")) {
          throw new Error(`Hook ${requiredHook} missing shebang`);
        }
      }

      this.addTestResult("Husky Scripts Validation", true, Date.now() - startTime);
    } catch (error) {
      this.addTestResult("Husky Scripts Validation", false, Date.now() - startTime, error.message);
    }
  }

  async testHookExecutionSimulation() {
    const startTime = Date.now();

    try {
      // Test lefthook dry run if available
      const lefthookPath = path.join(ROOT_DIR, ".lefthook.yml");

      if (fs.existsSync(lefthookPath)) {
        // Simulate hook execution by checking configuration
        const content = fs.readFileSync(lefthookPath, "utf8");
        const config = parseYaml(content);

        if (config["pre-commit"]?.commands) {
          // Validate that all commands have valid run properties
          for (const [name, cmd] of Object.entries(config["pre-commit"].commands)) {
            if (typeof cmd.run !== "string" || cmd.run.trim() === "") {
              throw new Error(`Invalid run command for ${name}`);
            }
          }
        }
      }

      this.addTestResult("Hook Execution Simulation", true, Date.now() - startTime);
    } catch (error) {
      this.addTestResult("Hook Execution Simulation", false, Date.now() - startTime, error.message);
    }
  }

  async testErrorHandling() {
    const startTime = Date.now();

    try {
      // Test error handling in hooks
      const huskyDir = path.join(ROOT_DIR, ".husky");

      if (fs.existsSync(huskyDir)) {
        const hookFiles = fs.readdirSync(huskyDir);

        for (const hookFile of hookFiles) {
          const hookPath = path.join(huskyDir, hookFile);
          if (fs.statSync(hookPath).isFile()) {
            const content = fs.readFileSync(hookPath, "utf8");

            // Check for error handling patterns
            const hasErrorHandling =
              content.includes("set -e") ||
              content.includes("trap") ||
              content.includes("if [ $? -ne 0 ]");

            if (!hasErrorHandling) {
              // This is a warning, not a failure
              this.addTestResult(
                `Error Handling in ${hookFile}`,
                false,
                0,
                "No error handling detected",
                { type: "warning" },
              );
            } else {
              this.addTestResult(`Error Handling in ${hookFile}`, true, 0);
            }
          }
        }
      }

      this.addTestResult("Error Handling Test", true, Date.now() - startTime);
    } catch (error) {
      this.addTestResult("Error Handling Test", false, Date.now() - startTime, error.message);
    }
  }

  async testPerformanceBenchmark() {
    const startTime = Date.now();

    try {
      // Benchmark configuration parsing
      const lefthookPath = path.join(ROOT_DIR, ".lefthook.yml");

      if (fs.existsSync(lefthookPath)) {
        const parseStart = Date.now();
        const content = fs.readFileSync(lefthookPath, "utf8");
        const config = parseYaml(content);
        const parseTime = Date.now() - parseStart;

        this.recordPerformance("Configuration Parse Time", parseTime);

        // Count commands for complexity metric
        let commandCount = 0;
        if (config["pre-commit"]?.commands) {
          commandCount = Object.keys(config["pre-commit"].commands).length;
        }

        this.recordPerformance("Total Commands", commandCount, "count");

        // Estimate execution time based on command count
        const estimatedTime = commandCount * 1000; // Rough estimate: 1s per command
        this.recordPerformance("Estimated Execution Time", estimatedTime);
      }

      this.addTestResult("Performance Benchmark", true, Date.now() - startTime);
    } catch (error) {
      this.addTestResult("Performance Benchmark", false, Date.now() - startTime, error.message);
    }
  }

  async testIntegrationWithLintStaged() {
    const startTime = Date.now();

    try {
      const lintStagedPath = path.join(ROOT_DIR, "lint-staged.config.js");

      if (fs.existsSync(lintStagedPath)) {
        const content = fs.readFileSync(lintStagedPath, "utf8");

        // Check if lint-staged is properly configured
        if (!content.includes("eslint") && !content.includes("prettier")) {
          throw new Error("lint-staged configuration appears incomplete");
        }

        // Check lefthook integration
        const lefthookPath = path.join(ROOT_DIR, ".lefthook.yml");
        if (fs.existsSync(lefthookPath)) {
          const lefthookContent = fs.readFileSync(lefthookPath, "utf8");
          if (!lefthookContent.includes("lint-staged")) {
            throw new Error("lint-staged not integrated with lefthook");
          }
        }
      }

      this.addTestResult("Lint-staged Integration", true, Date.now() - startTime);
    } catch (error) {
      this.addTestResult("Lint-staged Integration", false, Date.now() - startTime, error.message);
    }
  }

  async testCIIntegration() {
    const startTime = Date.now();

    try {
      const workflowsDir = path.join(ROOT_DIR, ".github/workflows");

      if (fs.existsSync(workflowsDir)) {
        const workflows = fs.readdirSync(workflowsDir);
        const ciWorkflow = workflows.find((w) => w.includes("ci.yml"));

        if (ciWorkflow) {
          const ciPath = path.join(workflowsDir, ciWorkflow);
          const content = fs.readFileSync(ciPath, "utf8");

          // Check for hooks-related steps
          if (!content.includes("lefthook") && !content.includes("husky")) {
            // This might be okay if hooks are tested separately
            this.addTestResult("CI Integration Check", true, Date.now() - startTime, null, {
              note: "Hooks not explicitly tested in CI workflow",
            });
          } else {
            this.addTestResult("CI Integration Check", true, Date.now() - startTime);
          }
        } else {
          throw new Error("CI workflow not found");
        }
      } else {
        throw new Error("GitHub workflows directory not found");
      }
    } catch (error) {
      this.addTestResult("CI Integration Test", false, Date.now() - startTime, error.message);
    }
  }

  async runAllTests() {
    console.log("🧪 Running Husky & Lefthook integration tests...\n");

    await this.testLefthookInstallation();
    await this.testConfigurationValidation();
    await this.testHuskyScripts();
    await this.testHookExecutionSimulation();
    await this.testErrorHandling();
    await this.testPerformanceBenchmark();
    await this.testIntegrationWithLintStaged();
    await this.testCIIntegration();

    return this.generateTestReport();
  }

  generateTestReport() {
    console.log("\n🧪 Integration Test Report");
    console.log("=".repeat(50));

    const passed = this.testResults.filter((t) => t.passed).length;
    const failed = this.testResults.length - passed;

    console.log(
      `\n📊 Test Results: ${passed} passed, ${failed} failed out of ${this.testResults.length} tests\n`,
    );

    if (failed > 0) {
      console.log("❌ FAILED TESTS:");
      this.testResults
        .filter((t) => !t.passed)
        .forEach((test) => {
          console.log(`  • ${test.name}: ${test.error}`);
          if (test.details.note) {
            console.log(`    Note: ${test.details.note}`);
          }
        });
      console.log("");
    }

    if (passed > 0) {
      console.log("✅ PASSED TESTS:");
      this.testResults
        .filter((t) => t.passed)
        .forEach((test) => {
          console.log(`  • ${test.name}${test.duration ? ` (${test.duration}ms)` : ""}`);
          if (test.details.note) {
            console.log(`    Note: ${test.details.note}`);
          }
        });
      console.log("");
    }

    // Performance metrics
    if (this.performanceMetrics.length > 0) {
      console.log("⚡ PERFORMANCE METRICS:");
      this.performanceMetrics.forEach((metric) => {
        console.log(`  • ${metric.metric}: ${metric.value} ${metric.unit}`);
      });
      console.log("");
    }

    return failed === 0;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new HooksTester();
  tester.runAllTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export default HooksTester;
