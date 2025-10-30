/**
 * Database connection and query utilities for Political Sphere
 * Provides secure database operations with proper error handling
 */

import Database from 'better-sqlite3';
import path from 'path';
import { getLogger } from './logger.js';

const logger = getLogger({ service: 'database' });

// Database configuration
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'political_sphere.db');

// Connection cache
let dbInstance = null;

/**
 * Get database connection (singleton pattern)
 */
export function getDatabase() {
  if (!dbInstance) {
    try {
      dbInstance = new Database(DB_PATH);

      // Enable WAL mode for better concurrency
      dbInstance.pragma('journal_mode = WAL');
      dbInstance.pragma('foreign_keys = ON');

      logger.info('Database connection established', { path: DB_PATH });
    } catch (error) {
      logger.fatal('Failed to connect to database', { error: error.message, path: DB_PATH });
      throw error;
    }
  }

  return dbInstance;
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed');
  }
}

/**
 * Execute a query with proper error handling
 */
export function executeQuery(query, params = []) {
  const db = getDatabase();

  try {
    const stmt = db.prepare(query);
    return stmt.all(params);
  } catch (error) {
    logger.error('Query execution failed', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      error: error.message,
      params: JSON.stringify(params)
    });
    throw error;
  }
}

/**
 * Execute a single-row query
 */
export function executeQuerySingle(query, params = []) {
  const db = getDatabase();

  try {
    const stmt = db.prepare(query);
    return stmt.get(params);
  } catch (error) {
    logger.error('Single query execution failed', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      error: error.message,
      params: JSON.stringify(params)
    });
    throw error;
  }
}

/**
 * Execute an insert/update/delete query
 */
export function executeMutation(query, params = []) {
  const db = getDatabase();

  try {
    const stmt = db.prepare(query);
    const result = stmt.run(params);

    logger.debug('Mutation executed', {
      query: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid
    });

    return result;
  } catch (error) {
    logger.error('Mutation execution failed', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      error: error.message,
      params: JSON.stringify(params)
    });
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction
 */
export function executeTransaction(queries) {
  const db = getDatabase();

  try {
    const transaction = db.transaction(() => {
      const results = [];

      for (const { query, params = [] } of queries) {
        const stmt = db.prepare(query);
        const result = stmt.run(params);
        results.push(result);
      }

      return results;
    });

    const results = transaction();
    logger.debug('Transaction completed', { queryCount: queries.length });

    return results;
  } catch (error) {
    logger.error('Transaction failed', {
      error: error.message,
      queryCount: queries.length
    });
    throw error;
  }
}

/**
 * User database operations
 */
export const userQueries = {
  create: `
    INSERT INTO users (id, email, password_hash, role, is_active, email_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `,

  findByEmail: `
    SELECT id, email, password_hash, role, is_active, created_at, updated_at,
           last_login, login_attempts, locked_until, password_changed_at,
           email_verified
    FROM users WHERE email = ?
  `,

  findById: `
    SELECT id, email, role, is_active, created_at, updated_at, last_login,
           email_verified
    FROM users WHERE id = ?
  `,

  updateLastLogin: `
    UPDATE users SET last_login = ?, login_attempts = 0 WHERE id = ?
  `,

  incrementLoginAttempts: `
    UPDATE users SET login_attempts = login_attempts + 1,
                     locked_until = CASE
                       WHEN login_attempts + 1 >= 5 THEN datetime('now', '+15 minutes')
                       ELSE NULL
                     END
    WHERE id = ?
  `,

  resetLoginAttempts: `
    UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?
  `,

  updatePassword: `
    UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  addPasswordHistory: `
    INSERT INTO password_history (id, user_id, password_hash)
    VALUES (?, ?, ?)
  `,

  checkPasswordHistory: `
    SELECT COUNT(*) as count FROM password_history
    WHERE user_id = ? AND password_hash = ?
  `,

  deactivateUser: `
    UPDATE users SET is_active = 0 WHERE id = ?
  `,

  activateUser: `
    UPDATE users SET is_active = 1 WHERE id = ?
  `
};

/**
 * Session database operations
 */
export const sessionQueries = {
  create: `
    INSERT INTO sessions (id, user_id, user_agent, ip_address, expires_at)
    VALUES (?, ?, ?, ?, datetime('now', '+24 hours'))
  `,

  findById: `
    SELECT * FROM sessions WHERE id = ? AND expires_at > CURRENT_TIMESTAMP
  `,

  updateActivity: `
    UPDATE sessions SET last_activity = CURRENT_TIMESTAMP,
                        expires_at = datetime('now', '+24 hours')
    WHERE id = ?
  `,

  delete: `
    DELETE FROM sessions WHERE id = ?
  `,

  cleanupExpired: `
    DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP
  `,

  deleteUserSessions: `
    DELETE FROM sessions WHERE user_id = ?
  `
};

/**
 * Rate limiting operations
 */
export const rateLimitQueries = {
  check: `
    SELECT attempts, blocked_until FROM rate_limits
    WHERE identifier = ? AND action = ? AND window_start <= CURRENT_TIMESTAMP
    ORDER BY window_start DESC LIMIT 1
  `,

  increment: `
    INSERT OR REPLACE INTO rate_limits
    (id, identifier, action, attempts, window_start, window_end, blocked_until)
    VALUES (
      COALESCE(
        (SELECT id FROM rate_limits WHERE identifier = ? AND action = ? AND window_start <= CURRENT_TIMESTAMP),
        lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6)))
      ),
      ?,
      ?,
      COALESCE((SELECT attempts FROM rate_limits WHERE identifier = ? AND action = ? AND window_start <= CURRENT_TIMESTAMP), 0) + 1,
      CURRENT_TIMESTAMP,
      datetime('now', '+1 minute'),
      CASE
        WHEN COALESCE((SELECT attempts FROM rate_limits WHERE identifier = ? AND action = ? AND window_start <= CURRENT_TIMESTAMP), 0) + 1 >= 5
        THEN datetime('now', '+15 minutes')
        ELSE NULL
      END
    )
  `,

  cleanup: `
    DELETE FROM rate_limits WHERE window_end <= CURRENT_TIMESTAMP
  `
};

/**
 * Audit logging operations
 */
export const auditQueries = {
  log: `
    INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,

  getUserActivity: `
    SELECT * FROM audit_log
    WHERE user_id = ? AND timestamp >= ?
    ORDER BY timestamp DESC LIMIT ?
  `,

  getRecentActivity: `
    SELECT * FROM audit_log
    WHERE timestamp >= datetime('now', '-24 hours')
    ORDER BY timestamp DESC LIMIT ?
  `
};

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, closing database connection');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, closing database connection');
  closeDatabase();
  process.exit(0);
});
