#!/usr/bin/env node

/**
 * Database Initialization Script for Political Sphere
 * Initializes SQLite database with proper schema and security settings
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Simple console logger for database initialization
const logger = {
  info: (message, meta = {}) => console.log(`[INFO] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : ''),
  warn: (message, meta = {}) => console.warn(`[WARN] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : ''),
  error: (message, meta = {}) => console.error(`[ERROR] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : ''),
  fatal: (message, meta = {}) => console.error(`[FATAL] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '')
};

// Database configuration
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'political_sphere.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  logger.info('Created data directory', { path: DB_DIR });
}

let db;

try {
  // Create database connection
  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  logger.info('Database connection established', { path: DB_PATH });

  // Create users table
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
      is_active BOOLEAN NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until DATETIME,
      password_changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      email_verified BOOLEAN NOT NULL DEFAULT 0,
      email_verification_token TEXT,
      email_verification_expires DATETIME,
      password_reset_token TEXT,
      password_reset_expires DATETIME,

      -- Audit fields
      created_by TEXT,
      updated_by TEXT,

      -- Constraints
      CHECK (length(password_hash) >= 60), -- bcrypt hash length
      CHECK (length(email) >= 5 AND length(email) <= 254),
      CHECK (login_attempts >= 0 AND login_attempts <= 10)
    );
  `;

  // Create password history table
  const createPasswordHistoryTable = `
    CREATE TABLE IF NOT EXISTS password_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, password_hash)
    );
  `;

  // Create sessions table
  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,

      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  // Create rate limiting table
  const createRateLimitTable = `
    CREATE TABLE IF NOT EXISTS rate_limits (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL, -- IP, user ID, or email
      action TEXT NOT NULL, -- 'login', 'register', 'reset_password'
      attempts INTEGER NOT NULL DEFAULT 1,
      window_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      window_end DATETIME NOT NULL,
      blocked_until DATETIME,

      UNIQUE(identifier, action, window_start)
    );
  `;

  // Create audit log table
  const createAuditLogTable = `
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT, -- JSON string
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `;

  // Execute table creation
  db.exec(createUsersTable);
  logger.info('Created users table');

  db.exec(createPasswordHistoryTable);
  logger.info('Created password_history table');

  db.exec(createSessionsTable);
  logger.info('Created sessions table');

  db.exec(createRateLimitTable);
  logger.info('Created rate_limits table');

  db.exec(createAuditLogTable);
  logger.info('Created audit_log table');

  // Create indexes for performance
  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
    CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start, window_end);
    CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);
  `;

  db.exec(createIndexes);
  logger.info('Created database indexes');

  // Create triggers for updated_at
  const createTriggers = `
    CREATE TRIGGER IF NOT EXISTS update_users_updated_at
      AFTER UPDATE ON users
      FOR EACH ROW
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

    CREATE TRIGGER IF NOT EXISTS update_sessions_last_activity
      AFTER UPDATE ON sessions
      FOR EACH ROW
      WHEN NEW.last_activity != OLD.last_activity
      BEGIN
        UPDATE sessions SET expires_at =
          datetime(NEW.last_activity, '+24 hours')
        WHERE id = NEW.id;
      END;
  `;

  db.exec(createTriggers);
  logger.info('Created database triggers');

  // Insert default admin user if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const adminId = 'admin-' + Date.now();
    const adminEmail = 'admin@political-sphere.local';
    const adminPassword = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8ZJcKvqMyW'; // 'Admin123!'

    const insertAdmin = db.prepare(`
      INSERT INTO users (id, email, password_hash, role, is_active, email_verified)
      VALUES (?, ?, ?, 'admin', 1, 1)
    `);

    insertAdmin.run(adminId, adminEmail, adminPassword);
    logger.info('Created default admin user', { email: adminEmail, id: adminId });
  }

  logger.info('Database initialization completed successfully');

} catch (error) {
  logger.fatal('Database initialization failed', { error: error.message, stack: error.stack });
  throw error;
} finally {
  if (db) {
    db.close();
    logger.info('Database connection closed');
  }
}

// Export for use as module
export { DB_PATH };
