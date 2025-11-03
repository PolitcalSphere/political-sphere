import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';

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

// For test runs, use a unique temp DB file to avoid cross-test pollution
if (process.env.NODE_ENV === 'test') {
  const fileName = `political_sphere_test_${process.pid}.db`;
  DB_PATH = path.join(os.tmpdir(), fileName);
}

export function initializeDatabase(): Database.Database {
  // Ensure the directory exists before opening the DB file
  const dir = path.dirname(DB_PATH);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_e) {
    // If for some reason directory creation fails, let better-sqlite3 report the error
  }

  // For test runs, start with a fresh DB file for each new connection to avoid cross-test pollution
  if (process.env.NODE_ENV === 'test') {
    try {
      if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
    } catch (_e) {
      // ignore - will error when opening if removal failed
    }
  }

  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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
