/**
 * Initial schema migration
 * Creates the core tables for users, parties, bills, and votes
 * Owned by: API Team
 * @see docs/architecture/decisions/adr-0001-database-migrations.md
 */

export const name = "001_initial_schema";

export function up(db) {
  console.log('Running migration up function...');
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Parties table
    CREATE TABLE IF NOT EXISTS parties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Bills table
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      proposer_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (proposer_id) REFERENCES users(id)
    );

    -- Votes table
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      vote TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bill_id) REFERENCES bills(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(bill_id, user_id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_bills_proposer ON bills(proposer_id);
    CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
    CREATE INDEX IF NOT EXISTS idx_votes_bill ON votes(bill_id);
    CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
  `);
  console.log('Migration up function completed');
}

export function down(db) {
  db.exec(`
    DROP INDEX IF EXISTS idx_votes_user;
    DROP INDEX IF EXISTS idx_votes_bill;
    DROP INDEX IF EXISTS idx_bills_status;
    DROP INDEX IF EXISTS idx_bills_author;
    DROP TABLE IF EXISTS votes;
    DROP TABLE IF EXISTS bills;
    DROP TABLE IF EXISTS parties;
    DROP TABLE IF EXISTS users;
  `);
}
