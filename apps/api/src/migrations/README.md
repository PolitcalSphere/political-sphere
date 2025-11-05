# Database Migrations

This directory contains database migration files for the Political Sphere API.

## Overview

Migrations are used to manage database schema changes in a controlled, versioned manner. Each migration file contains `up` and `down` functions to apply and rollback changes respectively.

## Structure

- `index.js`: Main migration runner with initialization, validation, and rollback support
- `MigrationError.js`: Custom error classes for migration-specific errors
- `001_initial_schema.js`: Initial database schema creation
- Future migrations: `002_*.js`, `003_*.js`, etc.

## Usage

### Running Migrations

```javascript
import { initializeDatabase, runMigrations } from "./migrations/index.js";

const db = initializeDatabase();
await runMigrations(db);
```

### Rolling Back Migrations

```javascript
import { rollbackAllMigrations } from "./migrations/index.js";

await rollbackAllMigrations(db);
```

## Creating New Migrations

1. Create a new file: `00N_migration_name.js` (where N is the next number)
2. Export `name`, `up`, and `down` functions:

```javascript
export const name = "00N_migration_name";

export function up(db) {
  // Apply changes
  db.exec(`CREATE TABLE example (...)`);
}

export function down(db) {
  // Rollback changes
  db.exec(`DROP TABLE example`);
}
```

## Error Handling

Migrations use custom error classes:

- `MigrationError`: General migration failures
- `MigrationRollbackError`: Rollback-specific failures
- `MigrationValidationError`: Schema validation failures

## Validation

After migrations, the system validates:

- All expected tables exist
- Foreign key constraints are satisfied
- No orphaned records

## Ownership

Owned by: API Team
@see docs/04-architecture/decisions/adr-0001-database-migrations.md
