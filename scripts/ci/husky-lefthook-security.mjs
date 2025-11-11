#!/usr/bin/env node
/**
 * Husky & Lefthook Security Scanner
 *
 * Scans the .husky and .lefthook.yml configuration for:
 * - Security vulnerabilities in hook scripts
 * - Potential command injection risks
 * - Insecure configurations
 * - Secret exposure risks
 * - Malicious code patterns
 *
 * Owner: Security Team
 * Last updated: 2025-10-31
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

class SecurityScanner {
  constructor() {
    this.vulnerabilities = [];
    this.warnings = [];
    this.info = [];
  }

  addVulnerability(severity, title, description, file = null, line = null, cwe = null) {
    const vuln = { severity, title, description, file, line, cwe };
    if (severity === "critical" || severity === "high") {
      this.vulnerabilities.push(vuln);
    } else if (severity === "medium" || severity === "low") {
      this.warnings.push(vuln);
    } else {
      this.info.push(vuln);
    }
  }

  async scanLefthookConfig() {
    const lefthookPath = path.join(ROOT_DIR, ".lefthook.yml");

    if (!fs.existsSync(lefthookPath)) {
      this.addVulnerability(
        "high",
        "Missing Configuration File",
        ".lefthook.yml configuration file is missing",
        lefthookPath,
      );
      return;
    }

    try {
      const content = fs.readFileSync(lefthookPath, "utf8");
      const config = parseYaml(content);

      // Check for dangerous commands
      const dangerousCommands = [
        "rm -rf /",
        "sudo",
        "chmod 777",
        "eval",
        "exec",
        "source",
        "curl.*|.*wget.*|.*bash.*",
        "npm install.*-g",
        "yarn global add",
      ];

      const lines = content.split("\n");
      lines.forEach((line, index) => {
        const lineNum = index + 1;

        for (const cmd of dangerousCommands) {
          if (line.includes(cmd) && !line.trim().startsWith("#")) {
            this.addVulnerability(
              "high",
              "Dangerous Command Detected",
              `Potentially dangerous command pattern found: ${cmd}`,
              lefthookPath,
              lineNum,
              "CWE-78",
            );
          }
        }

        // Check for hardcoded secrets
        const secretPatterns = [
          /password\s*[:=]\s*['"][^'"]+['"]/i,
          /token\s*[:=]\s*['"][^'"]+['"]/i,
          /key\s*[:=]\s*['"][^'"]+['"]/i,
          /secret\s*[:=]\s*['"][^'"]+['"]/i,
          /api[_-]?key/i,
        ];

        for (const pattern of secretPatterns) {
          if (pattern.test(line) && !line.includes("secrets.") && !line.includes("${{")) {
            this.addVulnerability(
              "critical",
              "Hardcoded Secret Detected",
              "Potential hardcoded secret found in configuration",
              lefthookPath,
              lineNum,
              "CWE-798",
            );
          }
        }

        // Check for shell injection vulnerabilities
        if (
          line.includes("$") &&
          !line.includes("${{") &&
          !line.includes("$HOME") &&
          !line.includes("$PWD")
        ) {
          if (line.includes("run:") && (line.includes("$1") || line.includes("$2"))) {
            this.addVulnerability(
              "medium",
              "Potential Shell Injection",
              "Unescaped variables in run command may allow injection",
              lefthookPath,
              lineNum,
              "CWE-78",
            );
          }
        }
      });

      // Check for missing security features
      if (!content.includes("secrets") && !content.includes("GITHUB_TOKEN")) {
        this.addVulnerability(
          "low",
          "No Secret Management",
          "Configuration does not reference GitHub secrets",
          lefthookPath,
        );
      }
    } catch (error) {
      this.addVulnerability(
        "high",
        "Configuration Parse Error",
        `Failed to parse .lefthook.yml: ${error.message}`,
        lefthookPath,
      );
    }
  }

  async scanHuskyScripts() {
    const huskyDir = path.join(ROOT_DIR, ".husky");

    if (!fs.existsSync(huskyDir)) {
      this.addVulnerability(
        "high",
        "Missing Husky Directory",
        ".husky directory is missing",
        huskyDir,
      );
      return;
    }

    const hookFiles = fs.readdirSync(huskyDir);

    for (const hookFile of hookFiles) {
      const hookPath = path.join(huskyDir, hookFile);
      const stat = fs.statSync(hookPath);

      if (!stat.isFile()) continue;

      const content = fs.readFileSync(hookPath, "utf8");
      const lines = content.split("\n");

      // Check file permissions
      const permissions = stat.mode & 0o777;
      if (permissions & 0o002) {
        // world writable
        this.addVulnerability(
          "high",
          "Insecure File Permissions",
          `Hook file is world-writable: ${hookFile}`,
          hookPath,
          null,
          "CWE-732",
        );
      }

      // Check for dangerous patterns
      lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Dangerous shell commands
        const dangerousPatterns = [
          /rm\s+-rf\s+\//,
          /sudo\s+/,
          /chmod\s+777/,
          /eval\s+/,
          /exec\s+/,
          /curl.*\|\s*bash/,
          /wget.*\|\s*bash/,
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(line) && !line.trim().startsWith("#")) {
            this.addVulnerability(
              "high",
              "Dangerous Shell Command",
              `Potentially dangerous shell command: ${pattern}`,
              hookPath,
              lineNum,
              "CWE-78",
            );
          }
        }

        // Check for proper quoting
        if (line.includes("$") && !line.includes('"') && !line.includes("'")) {
          if (line.includes("echo") || line.includes("printf")) {
            this.addVulnerability(
              "medium",
              "Unquoted Variable",
              "Variable used without quotes may allow injection",
              hookPath,
              lineNum,
              "CWE-78",
            );
          }
        }

        // Check for set -e usage
        if (line.includes("set -e") || line.includes("set -eu") || line.includes("set -eux")) {
          // Good - error handling is enabled
        } else if (lines.some((l) => l.includes("set -e"))) {
          // Already set earlier
        } else if (index > 5) {
          // Check if set -e is missing after shebang
          this.addVulnerability(
            "low",
            "Missing Error Handling",
            'Hook script does not use "set -e" for error handling',
            hookPath,
          );
        }
      });

      // Check for shebang security
      if (!content.startsWith("#!/")) {
        this.addVulnerability(
          "medium",
          "Missing Shebang",
          "Hook script missing shebang, may not execute properly",
          hookPath,
        );
      } else if (content.includes("#!/bin/sh") && content.includes("bash")) {
        this.addVulnerability(
          "low",
          "Shell Mismatch",
          "Script uses /bin/sh shebang but contains bash-specific syntax",
          hookPath,
        );
      }
    }
  }

  async scanForMaliciousPatterns() {
    // Check for suspicious file patterns
    const suspiciousFiles = [
      ".husky/.git",
      ".husky/.git/hooks",
      ".lefthook.yml.bak",
      ".husky/pre-commit.bak",
    ];

    for (const file of suspiciousFiles) {
      const filePath = path.join(ROOT_DIR, file);
      if (fs.existsSync(filePath)) {
        this.addVulnerability(
          "high",
          "Suspicious File Detected",
          `Potentially malicious file found: ${file}`,
          filePath,
        );
      }
    }

    // Check for hidden files in .husky
    const huskyDir = path.join(ROOT_DIR, ".husky");
    if (fs.existsSync(huskyDir)) {
      const files = fs.readdirSync(huskyDir);
      for (const file of files) {
        if (file.startsWith(".")) {
          this.addVulnerability(
            "medium",
            "Hidden File in Hooks",
            `Hidden file found in .husky directory: ${file}`,
            path.join(huskyDir, file),
          );
        }
      }
    }
  }

  async scanDependencies() {
    const packageJsonPath = path.join(ROOT_DIR, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      // Check lefthook version
      if (packageJson.dependencies && packageJson.dependencies.lefthook) {
        const version = packageJson.dependencies.lefthook;
        if (version.includes("^") || version.includes("~")) {
          this.addVulnerability(
            "low",
            "Insecure Version Pinning",
            "lefthook version uses flexible versioning, consider pinning to specific version",
          );
        }
      }

      // Check for husky
      if (!packageJson.dependencies || !packageJson.dependencies.husky) {
        this.addVulnerability(
          "medium",
          "Missing Husky Dependency",
          "Husky is not listed as a dependency but .husky directory exists",
        );
      }
    }
  }

  async runSecurityScan() {
    console.log("🔒 Scanning Husky & Lefthook configuration for security vulnerabilities...\n");

    await this.scanLefthookConfig();
    await this.scanHuskyScripts();
    await this.scanForMaliciousPatterns();
    await this.scanDependencies();

    return this.generateSecurityReport();
  }

  generateSecurityReport() {
    console.log("\n🛡️  Security Scan Report");
    console.log("=".repeat(50));

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    const allIssues = [...this.vulnerabilities, ...this.warnings, ...this.info].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

    if (allIssues.length === 0) {
      console.log("\n✅ No security vulnerabilities found!");
    } else {
      const criticalCount = this.vulnerabilities.filter((v) => v.severity === "critical").length;
      const highCount = this.vulnerabilities.filter((v) => v.severity === "high").length;
      const mediumCount = this.warnings.filter((w) => w.severity === "medium").length;
      const lowCount = this.warnings.filter((w) => w.severity === "low").length;

      console.log(
        `\n🚨 CRITICAL: ${criticalCount} | HIGH: ${highCount} | MEDIUM: ${mediumCount} | LOW: ${lowCount}\n`,
      );

      allIssues.forEach((issue) => {
        const severityIcon =
          {
            critical: "🚨",
            high: "🔴",
            medium: "🟠",
            low: "🟡",
            info: "ℹ️",
          }[issue.severity] || "❓";

        console.log(`${severityIcon} ${issue.severity.toUpperCase()}: ${issue.title}`);
        console.log(`   ${issue.description}`);
        if (issue.cwe) {
          console.log(`   CWE: ${issue.cwe}`);
        }
        if (issue.file) {
          const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
          console.log(`   Location: ${location}`);
        }
        console.log("");
      });
    }

    const hasCriticalOrHigh = this.vulnerabilities.some((v) =>
      ["critical", "high"].includes(v.severity),
    );
    return !hasCriticalOrHigh;
  }
}

// Run security scan if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const scanner = new SecurityScanner();
  scanner.runSecurityScan().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export default SecurityScanner;
