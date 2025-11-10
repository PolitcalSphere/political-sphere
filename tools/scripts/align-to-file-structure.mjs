#!/usr/bin/env node

/**
 * Align Repository to file-structure.md v2.4.0
 *
 * This script restructures the repository to match the canonical structure
 * defined in docs/architecture/file-structure.md
 *
 * Usage:
 *   node tools/scripts/align-to-file-structure.mjs --dry-run    # Preview
 *   node tools/scripts/align-to-file-structure.mjs --execute    # Execute
 *
 * @version 1.0.0
 * @date 2025-11-10
 */

import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

// Complete restructuring plan based on file-structure.md
const RESTRUCTURING_PLAN = {
  libs: {
    // libs/shared/ reorganization
    "libs/shared/utils": {
      create: true,
      move: ["libs/shared/src"], // Move existing src to utils/src
    },
    "libs/shared/types": {
      exists: true, // Already exists
    },
    "libs/shared/constants": {
      create: true,
    },
    "libs/shared/config": {
      create: true,
    },

    // libs/platform/ reorganization
    "libs/platform/auth": {
      create: true,
    },
    "libs/platform/api-client": {
      create: true,
    },
    "libs/platform/state": {
      create: true,
    },
    "libs/platform/routing": {
      create: true,
    },

    // libs/ui/ reorganization
    "libs/ui/components": {
      create: true,
    },
    "libs/ui/design-system": {
      create: true,
    },
    "libs/ui/accessibility": {
      create: true,
    },

    // libs/game-engine/ reorganization
    "libs/game-engine/core": {
      create: true,
      move: ["libs/game-engine/src"], // Move existing src to core/src
    },
    "libs/game-engine/simulation": {
      create: true,
    },
    "libs/game-engine/events": {
      create: true,
    },
  },
};

class StructureAligner {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.operations = [];
    this.errors = [];
  }

  log(message, level = "info") {
    const prefix = level === "error" ? "[ERROR]" : level === "warn" ? "[WARN]" : "[INFO]";
    console.log(`${prefix} ${message}`);
    this.operations.push({ level, message });
  }

  async pathExists(p) {
    try {
      await fs.access(path.join(ROOT_DIR, p));
      return true;
    } catch {
      return false;
    }
  }

  async createDirectory(dirPath, description) {
    const fullPath = path.join(ROOT_DIR, dirPath);

    if (await this.pathExists(dirPath)) {
      this.log(`Directory already exists: ${dirPath}`, "warn");
      return false;
    }

    this.log(`Creating: ${dirPath} - ${description}`);

    if (this.dryRun) {
      this.log(`  (Dry run) Would create: ${dirPath}`);
      return true;
    }

    try {
      await fs.mkdir(fullPath, { recursive: true });
      await fs.mkdir(path.join(fullPath, "src"), { recursive: true });

      // Create placeholder files
      await fs.writeFile(
        path.join(fullPath, "README.md"),
        `# ${path.basename(dirPath)}\n\nTODO: Add documentation\n`,
        "utf-8",
      );

      await fs.writeFile(
        path.join(fullPath, "src/index.ts"),
        `// ${path.basename(dirPath)} entry point\nexport {};\n`,
        "utf-8",
      );

      this.log(`  ✓ Created ${dirPath} with placeholder files`);
      return true;
    } catch (error) {
      this.log(`  ✗ Failed to create ${dirPath}: ${error.message}`, "error");
      this.errors.push(error);
      return false;
    }
  }

  async moveDirectory(source, target, description) {
    if (!(await this.pathExists(source))) {
      this.log(`Source doesn't exist: ${source}`, "warn");
      return false;
    }

    if (await this.pathExists(target)) {
      this.log(`Target already exists: ${target}`, "warn");
      return false;
    }

    this.log(`Moving: ${source} → ${target} - ${description}`);

    if (this.dryRun) {
      this.log(`  (Dry run) Would execute: git mv ${source} ${target}`);
      return true;
    }

    try {
      const targetDir = path.dirname(path.join(ROOT_DIR, target));
      await fs.mkdir(targetDir, { recursive: true });

      execSync(`git mv "${source}" "${target}"`, { cwd: ROOT_DIR, stdio: "pipe" });
      this.log(`  ✓ Moved ${source} to ${target}`);
      return true;
    } catch (error) {
      this.log(`  ✗ Failed to move ${source}: ${error.message}`, "error");
      this.errors.push(error);
      return false;
    }
  }

  async restructureLibs() {
    this.log("\n=== Restructuring libs/ ===\n");

    // Create libs/shared/ subdirectories
    await this.createDirectory("libs/shared/utils", "Utility functions");
    await this.createDirectory("libs/shared/constants", "Application constants");
    await this.createDirectory("libs/shared/config", "Configuration management");

    // Create libs/platform/ subdirectories
    await this.createDirectory("libs/platform/auth", "Authentication services");
    await this.createDirectory("libs/platform/api-client", "API client library");
    await this.createDirectory("libs/platform/state", "State management");
    await this.createDirectory("libs/platform/routing", "Routing utilities");

    // Create libs/ui/ subdirectories
    await this.createDirectory("libs/ui/components", "Reusable React components");
    await this.createDirectory("libs/ui/design-system", "Design tokens & patterns");
    await this.createDirectory("libs/ui/accessibility", "Accessibility utilities");

    // Create libs/game-engine/ subdirectories
    await this.createDirectory("libs/game-engine/core", "Core game logic");
    await this.createDirectory("libs/game-engine/simulation", "Simulation algorithms");
    await this.createDirectory("libs/game-engine/events", "Event system");
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun,
      operations: this.operations,
      errors: this.errors,
      summary: {
        total: this.operations.length,
        errors: this.errors.length,
      },
    };

    const reportPath = path.join(ROOT_DIR, "reports/structure-alignment.json");
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    this.log(`\n✓ Report saved to: ${reportPath}`);
    return report;
  }

  async run() {
    try {
      this.log("=".repeat(80));
      this.log("REPOSITORY STRUCTURE ALIGNMENT");
      this.log("Target: file-structure.md v2.4.0");
      this.log("Mode: " + (this.dryRun ? "DRY RUN" : "EXECUTE"));
      this.log("=".repeat(80));

      await this.restructureLibs();
      await this.generateReport();

      if (this.errors.length > 0) {
        this.log(`\n⚠ Completed with ${this.errors.length} errors`, "warn");
      } else if (this.dryRun) {
        this.log("\n✓ Dry run completed. Run with --execute to apply changes.");
      } else {
        this.log("\n✓ Structure alignment completed!");
        this.log("\nNext steps:");
        this.log("  1. Review changes: git status");
        this.log("  2. Update imports in affected files");
        this.log("  3. Run tests: npm test");
        this.log(
          '  4. Commit: git add . && git commit -m "refactor: align structure to file-structure.md v2.4.0"',
        );
      }
    } catch (error) {
      this.log(`\n✗ Fatal error: ${error.message}`, "error");
      throw error;
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const execute = args.includes("--execute");

  if (!dryRun && !execute) {
    console.log(`
Repository Structure Alignment Tool

Usage:
  node tools/scripts/align-to-file-structure.mjs [options]

Options:
  --dry-run     Preview changes without executing
  --execute     Execute the alignment

Example:
  node tools/scripts/align-to-file-structure.mjs --dry-run
    `);
    process.exit(0);
  }

  const aligner = new StructureAligner({ dryRun });

  try {
    await aligner.run();
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Fatal error:", error.message);
    process.exit(1);
  }
}

main();
