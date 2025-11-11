import type Database from 'better-sqlite3';

import { CacheService } from '../../utils/cache.ts'; // eslint-disable-line no-restricted-imports
import { initializeDatabase, runMigrations } from '../../utils/migrations/index.js'; // eslint-disable-line no-restricted-imports

import { BillStore } from './bill-store.ts';
import { PartyStore } from './party-store.ts';
import { UserStore } from './user-store.ts';
import { VoteStore } from './vote-store.ts';

interface DatabaseOptions {
  cache?: CacheService;
  enableCache?: boolean;
}

function shouldEnableCache(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }
  if (process.env.API_ENABLE_CACHE === 'true') {
    return true;
  }
  if (process.env.API_ENABLE_CACHE === 'false') {
    return false;
  }
  return Boolean(process.env.REDIS_URL);
}

export class DatabaseConnection {
  private db: Database.Database;
  private cache?: CacheService;
  private ownsCache = false;
  public users: UserStore;
  public parties: PartyStore;
  public bills: BillStore;
  public votes: VoteStore;

  constructor(options: DatabaseOptions = {}) {
    this.db = initializeDatabase();

    // NOTE: runMigrations is async; calling without await leads to race condition in tests
    // where stores attempt queries before tables exist. For production we keep migrations async
    // (properly awaited during app bootstrap). For test environment we synchronously ensure the
    // minimal schema exists up-front to prevent 'no such table' errors.
    if (process.env.NODE_ENV === 'test') {
      this.ensureTestSchema();
    } else {
      // Fire and forget; production bootstrap should await this during server start.
      void runMigrations(this.db);
    }

    if (options.cache) {
      this.cache = options.cache;
    } else if (options.enableCache ?? shouldEnableCache()) {
      this.cache = new CacheService();
      this.ownsCache = true;
    }

    this.users = new UserStore(this.db, this.cache);
    this.parties = new PartyStore(this.db, this.cache);
    this.bills = new BillStore(this.db, this.cache);
    this.votes = new VoteStore(this.db, this.cache);
  }

  close(): void {
    this.db.close();
    if (this.ownsCache && this.cache) {
      void this.cache.close();
    }
  }

  // STATUS: PENDING_IMPLEMENTATION
  // REASON: Temporary synchronous schema creation for tests until migration bootstrap is refactored
  // DEPENDENCIES: Future improvement to await runMigrations during app initialization
  // ESTIMATED_READINESS: After introducing async bootstrap sequence for API server
  private ensureTestSchema(): void {
    // Users
    this.db.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      role TEXT DEFAULT 'VIEWER',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    );`);
    // Parties
    this.db.exec(`CREATE TABLE IF NOT EXISTS parties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT NOT NULL,
      created_at DATETIME NOT NULL
    );`);
    // Bills
    this.db.exec(`CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      proposer_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    );`);
    // Votes
    this.db.exec(`CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      vote TEXT NOT NULL,
      created_at DATETIME NOT NULL
    );`);
  }
}

// Singleton pattern for database connection
let dbConnection: DatabaseConnection | null = null;

export function getDatabase(options: DatabaseOptions = {}): DatabaseConnection {
  if (!dbConnection) {
    dbConnection = new DatabaseConnection(options);
  }
  return dbConnection;
}

export function closeDatabase(): void {
  if (dbConnection) {
    dbConnection.close();
    dbConnection = null;
  }
}

export type { DatabaseOptions };
