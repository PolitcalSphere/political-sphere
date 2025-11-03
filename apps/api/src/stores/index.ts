import Database from 'better-sqlite3';
import { initializeDatabase, runMigrations } from './migrations';
import { UserStore } from './user-store';
import { PartyStore } from './party-store';
import { BillStore } from './bill-store';
import { VoteStore } from './vote-store';
import { CacheService } from '../cache.js';

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
    runMigrations(this.db);

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
