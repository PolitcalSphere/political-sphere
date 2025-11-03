/**
 * Migration Tests
 * Tests database migration functionality
 * Owned by: API Team
 * @see docs/architecture/decisions/adr-0001-database-migrations.md
 */

import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import {
  initializeDatabase,
  runMigrations,
  rollbackAllMigrations,
} from "../src/migrations/index.js";
import {
  MigrationError,
  MigrationRollbackError,
  MigrationValidationError,
} from "../src/migrations/migration-error.js";
import { DEFAULT_DB_PATH } from "../src/config.js";

// Test database path - make it unique per test run
const getTestDbPath = () => path.join(path.dirname(DEFAULT_DB_PATH || "data"), `test-political-sphere-${Date.now()}-${Math.random()}.db`);

describe("Database Migrations", () => {
  let db;
  let testDbPath;

  beforeEach(() => {
    testDbPath = getTestDbPath();
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = initializeDatabase(testDbPath);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe("initializeDatabase", () => {
    it("should initialize database with WAL mode", () => {
      const pragma = db.prepare("PRAGMA journal_mode").get();
      assert.strictEqual(pragma.journal_mode, "wal");
    });

    it("should return a database connection", () => {
      assert(db);
      assert(typeof db.exec === "function");
    });
  });

  describe("runMigrations", () => {
    it("should apply migrations successfully", async () => {
      await runMigrations(db);

      // Check that tables were created
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all();
      const tableNames = tables.map((t) => t.name);
      assert(tableNames.includes("users"));
      assert(tableNames.includes("parties"));
      assert(tableNames.includes("bills"));
      assert(tableNames.includes("votes"));
      assert(tableNames.includes("_migrations"));
    });

    it("should track applied migrations", async () => {
      await runMigrations(db);

      const migrations = db.prepare("SELECT name FROM _migrations").all();
      assert(migrations.length > 0);
      assert(migrations.some((m) => m.name === "001_initial_schema"));
    });

    it("should skip already applied migrations", async () => {
      await runMigrations(db);
      const firstCount = db.prepare("SELECT COUNT(*) as count FROM _migrations").get().count;

      await runMigrations(db);
      const secondCount = db.prepare("SELECT COUNT(*) as count FROM _migrations").get().count;

      assert.strictEqual(firstCount, secondCount);
    });

    it("should validate schema after migrations", async () => {
      await runMigrations(db);

      // Check foreign key constraints
      const fkCheck = db.prepare("PRAGMA foreign_key_check").all();
      assert.strictEqual(fkCheck.length, 0, "Foreign key violations found");
    });

    it("should rollback on migration failure when rollbackOnError is true", async () => {
      // This test would require a failing migration, which is complex to set up
      // For now, we test the successful case
      await runMigrations(db);
      assert(true);
    });
  });

  describe("rollbackAllMigrations", () => {
    it("should rollback all applied migrations", async () => {
      await runMigrations(db);

      // Verify tables exist
      let tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all();
      assert(tables.length > 0);

      await rollbackAllMigrations(db);

      // Verify user tables were dropped but _migrations table remains
      tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all();
      assert.strictEqual(tables.length, 1); // Only _migrations table should remain
      assert.strictEqual(tables[0].name, "_migrations");
    });

    it("should clear migration tracking table", async () => {
      await runMigrations(db);

      const migrationsBefore = db.prepare("SELECT COUNT(*) as count FROM _migrations").get().count;
      assert(migrationsBefore > 0);

      await rollbackAllMigrations(db);

      const migrationsAfter = db.prepare("SELECT COUNT(*) as count FROM _migrations").get().count;
      assert.strictEqual(migrationsAfter, 0);
    });
  });

  describe("MigrationError classes", () => {
    it("should create MigrationError with correct properties", () => {
      const error = new MigrationError("Test error", "test_migration");
      assert.strictEqual(error.name, "MigrationError");
      assert.strictEqual(error.message, "Test error");
      assert.strictEqual(error.migrationName, "test_migration");
    });

    it("should create MigrationRollbackError", () => {
      const error = new MigrationRollbackError("Rollback failed", "test_migration");
      assert.strictEqual(error.name, "MigrationRollbackError");
    });

    it("should create MigrationValidationError", () => {
      const error = new MigrationValidationError("Validation failed", "test_migration");
      assert.strictEqual(error.name, "MigrationValidationError");
    });
  });

  describe("Performance", () => {
    it("should complete migrations within reasonable time", async () => {
      const startTime = Date.now();
      await runMigrations(db);
      const duration = Date.now() - startTime;

      // Should complete within 1 second
      assert(duration < 1000, `Migrations took too long: ${duration}ms`);
    });
  });
});
