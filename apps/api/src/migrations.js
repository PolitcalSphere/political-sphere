const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../../data/political_sphere.db");

function initializeDatabase() {
	// Use in-memory database for tests to ensure isolation
	const dbPath = process.env.NODE_ENV === "test" ? ":memory:" : DB_PATH;
	console.log(
		`[migrations] NODE_ENV=${process.env.NODE_ENV}, dbPath=${dbPath}`,
	);
	const db = new Database(dbPath);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");
	return db;
}

function runMigrations(db) {
	// Create users table
	db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      deletion_reason TEXT,
      deleted_by TEXT
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
    CREATE INDEX IF NOT EXISTS idx_bills_status_created_at ON bills(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_votes_bill_id ON votes(bill_id);
    CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
    CREATE INDEX IF NOT EXISTS idx_votes_bill_user ON votes(bill_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name);
  `);
}

module.exports = {
	initializeDatabase,
	runMigrations,
};
