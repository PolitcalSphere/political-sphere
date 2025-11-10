/**
 * Reset Development Environment
 *
 * Resets the development environment to a clean state by:
 * - Dropping and recreating the database
 * - Clearing cache and temporary files
 * - Resetting configuration to defaults
 * - Optionally re-seeding with fresh data
 *
 * @module scripts/reset-environment
 */

import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseConnector } from "../../../data/src/connectors/database-connector.js";

interface ResetOptions {
  database?: boolean;
  cache?: boolean;
  logs?: boolean;
  seed?: boolean;
  confirm?: boolean;
}

/**
 * Default reset options
 */
const DEFAULT_OPTIONS: ResetOptions = {
  database: true,
  cache: true,
  logs: true,
  seed: false,
  confirm: false,
};

/**
 * Reset the development environment
 */
async function resetEnvironment(options: ResetOptions = DEFAULT_OPTIONS): Promise<void> {
  console.log("🔄 Resetting development environment...");
  console.log("Options:", options);

  // Safety check - require confirmation in production-like environments
  if (!options.confirm && process.env.NODE_ENV === "production") {
    throw new Error("Cannot reset production environment without explicit confirmation");
  }

  const warnings: string[] = [];

  try {
    // Reset database
    if (options.database) {
      await resetDatabase();
    }

    // Clear cache directories
    if (options.cache) {
      clearCache(warnings);
    }

    // Clear log files
    if (options.logs) {
      clearLogs(warnings);
    }

    // Re-seed database if requested
    if (options.seed && options.database) {
      await seedDatabase();
    }

    console.log("✅ Environment reset completed successfully");

    if (warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      for (const warning of warnings) {
        console.log(`  - ${warning}`);
      }
    }
  } catch (error) {
    console.error("❌ Error resetting environment:", error);
    throw error;
  }
}

/**
 * Reset the database
 */
async function resetDatabase(): Promise<void> {
  console.log("  → Resetting database...");

  const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number.parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "political_sphere_dev",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
  };

  // Connect to default 'postgres' database to drop/create target database
  const adminDb = new DatabaseConnector({
    ...dbConfig,
    database: "postgres",
  });

  try {
    await adminDb.connect();

    // Terminate existing connections
    await adminDb.query(
      `SELECT pg_terminate_backend(pg_stat_activity.pid)
       FROM pg_stat_activity
       WHERE pg_stat_activity.datname = $1
         AND pid <> pg_backend_pid()`,
      [dbConfig.database],
    );

    // Drop database if exists
    await adminDb.query(`DROP DATABASE IF EXISTS ${dbConfig.database}`);
    console.log(`  ✓ Dropped database: ${dbConfig.database}`);

    // Create fresh database
    await adminDb.query(`CREATE DATABASE ${dbConfig.database}`);
    console.log(`  ✓ Created database: ${dbConfig.database}`);

    await adminDb.disconnect();

    // Run migrations
    console.log("  → Running migrations...");
    try {
      execSync("npm run migrate:dev", {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      console.log("  ✓ Migrations completed");
    } catch (error) {
      console.warn("  ⚠️  Migration failed or not configured:", error);
    }
  } catch (error) {
    await adminDb.disconnect();
    throw error;
  }
}

/**
 * Clear cache directories
 */
function clearCache(warnings: string[]): void {
  console.log("  → Clearing cache...");

  const cacheDirs = [
    ".nx/cache",
    "node_modules/.cache",
    "node_modules/.vite",
    ".vitest",
    "ai-cache",
    "ai/ai-cache",
  ];

  let clearedCount = 0;

  for (const dir of cacheDirs) {
    const fullPath = join(process.cwd(), dir);
    if (existsSync(fullPath)) {
      try {
        rmSync(fullPath, { recursive: true, force: true });
        clearedCount++;
      } catch (error) {
        warnings.push(`Failed to clear ${dir}: ${error}`);
      }
    }
  }

  console.log(`  ✓ Cleared ${clearedCount} cache directories`);
}

/**
 * Clear log files
 */
function clearLogs(warnings: string[]): void {
  console.log("  → Clearing logs...");

  const logDirs = ["logs", "coverage"];
  const logFiles = ["npm-debug.log", "yarn-debug.log", "pnpm-debug.log", "vitest-output.log"];

  let clearedCount = 0;

  // Clear log directories
  for (const dir of logDirs) {
    const fullPath = join(process.cwd(), dir);
    if (existsSync(fullPath)) {
      try {
        rmSync(fullPath, { recursive: true, force: true });
        clearedCount++;
      } catch (error) {
        warnings.push(`Failed to clear ${dir}: ${error}`);
      }
    }
  }

  // Clear individual log files
  for (const file of logFiles) {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      try {
        rmSync(fullPath);
        clearedCount++;
      } catch (error) {
        warnings.push(`Failed to clear ${file}: ${error}`);
      }
    }
  }

  console.log(`  ✓ Cleared ${clearedCount} log items`);
}

/**
 * Seed database with fresh data
 */
async function seedDatabase(): Promise<void> {
  console.log("  → Seeding database...");

  try {
    execSync("npm run seed:dev", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("  ✓ Database seeded");
  } catch (error) {
    console.warn("  ⚠️  Seeding failed or not configured:", error);
  }
}

/**
 * Parse command-line arguments
 */
function parseArgs(): ResetOptions {
  const args = process.argv.slice(2);
  const options: ResetOptions = { ...DEFAULT_OPTIONS };

  for (const arg of args) {
    if (arg === "--no-database") options.database = false;
    if (arg === "--no-cache") options.cache = false;
    if (arg === "--no-logs") options.logs = false;
    if (arg === "--seed") options.seed = true;
    if (arg === "--confirm") options.confirm = true;
  }

  return options;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();

  // Require confirmation for destructive operations
  if (!options.confirm) {
    console.log("⚠️  This will reset your development environment.");
    console.log("   Run with --confirm to proceed.");
    process.exit(1);
  }

  resetEnvironment(options)
    .then(() => {
      console.log("\n✅ Environment reset complete");
      console.log("You may need to restart development servers.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Reset failed:", error);
      process.exit(1);
    });
}

export { resetEnvironment };
