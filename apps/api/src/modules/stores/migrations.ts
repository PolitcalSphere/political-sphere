// os is not required when using in-memory DB for tests
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

// Support both ESM and CommonJS environments
const getDbPath = () => {
  if (typeof __dirname !== 'undefined') {
    // CommonJS or transformed code
    return path.join(__dirname, '../../../data/political_sphere.db');
  } else {
    // Pure ESM
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return path.join(__dirname, '../../../data/political_sphere.db');
  }
};

let DB_PATH = getDbPath();

// For test runs, prefer an in-memory database to avoid filesystem locking and
// interference between parallel test runs. Use a file-backed DB only outside tests.
if (process.env.NODE_ENV === 'test') {
  DB_PATH = ':memory:';
}

export function initializeDatabase(): Database.Database {
  // If using a file-backed DB, ensure the directory exists before opening it.
  if (DB_PATH !== ':memory:') {
    const dir = path.dirname(DB_PATH);
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // If for some reason directory creation fails, let better-sqlite3 report the error
    }
  }

  // Open the database. For in-memory DBs, better-sqlite3 accepts ':memory:'.
  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrency on file-backed DBs only. WAL is not
  // applicable for in-memory databases and can cause errors or be ignored.
  if (DB_PATH !== ':memory:') {
    try {
      db.pragma('journal_mode = WAL');
    } catch {
      // Ignore pragma failures; concurrency will be lower but tests should proceed.
    }
  }

  // Always enable foreign keys enforcement where supported.
  try {
    db.pragma('foreign_keys = ON');
  } catch {
    // Ignore if pragma not supported in some environments
  }

  return db;
}

export function runMigrations(db: Database.Database): void {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create parties table
  db.exec(`
    CREATE TABLE IF NOT EXISTS parties (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create bills table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      proposer_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('proposed', 'debating', 'passed', 'rejected')) DEFAULT 'proposed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (proposer_id) REFERENCES users(id)
    );
  `);

  // Create votes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      vote TEXT CHECK(vote IN ('aye', 'nay', 'abstain')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bill_id) REFERENCES bills(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(bill_id, user_id)
    );
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bills_proposer_id ON bills(proposer_id);
    CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
    CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);
    CREATE INDEX IF NOT EXISTS idx_votes_bill_id ON votes(bill_id);
    CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
    CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name);
  `);
}
