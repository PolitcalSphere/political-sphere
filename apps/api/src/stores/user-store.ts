import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { User, CreateUserInput } from "@political-sphere/shared";
import { CacheService, cacheKeys, CACHE_TTL } from "../cache.js";
import { retryWithBackoff, DatabaseError } from "../error-handler.js";

interface UserRow {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export class UserStore {
  constructor(private db: Database.Database, private cache?: CacheService) {}

  async create(input: CreateUserInput): Promise<User> {
    const id = uuidv4();
    const now = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, input.username, input.email, now.toISOString(), now.toISOString());

    const user: User = {
      id,
      username: input.username,
      email: input.email,
      createdAt: now,
      updatedAt: now,
    };

    if (this.cache) {
      await Promise.all([
        this.cache.set(cacheKeys.user(id), user, CACHE_TTL.USER),
        this.cache.set(cacheKeys.userByUsername(input.username), user, CACHE_TTL.USER),
        this.cache.set(cacheKeys.userByEmail(input.email), user, CACHE_TTL.USER),
        this.cache.invalidatePattern('user:*:bills'),
        this.cache.invalidatePattern('user:*:votes'),
      ]);
    }

    return user;
  }

  async getById(id: string): Promise<User | null> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<User>(cacheKeys.user(id));
      if (cached) return cached;
    }

    const row = this.db
      .prepare<[string], UserRow>(
        `SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?`,
      )
      .get(id);
    if (!row) return null;

    const user = {
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    // Cache the result
    if (this.cache) {
      await this.cache.set(cacheKeys.user(id), user, CACHE_TTL.USER);
    }

    return user;
  }

  async getByUsername(username: string): Promise<User | null> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<User>(cacheKeys.userByUsername(username));
      if (cached) return cached;
    }

    const row = this.db
      .prepare<[string], UserRow>(
        `SELECT id, username, email, created_at, updated_at FROM users WHERE username = ?`,
      )
      .get(username);
    if (!row) return null;

    const user = {
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    // Cache the result
    if (this.cache) {
      await this.cache.set(cacheKeys.userByUsername(username), user, CACHE_TTL.USER);
    }

    return user;
  }

  async getByEmail(email: string): Promise<User | null> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<User>(cacheKeys.userByEmail(email));
      if (cached) return cached;
    }

    const row = this.db
      .prepare<[string], UserRow>(
        `SELECT id, username, email, created_at, updated_at FROM users WHERE email = ?`,
      )
      .get(email);
    if (!row) return null;

    const user = {
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    // Cache the result
    if (this.cache) {
      await this.cache.set(cacheKeys.userByEmail(email), user, CACHE_TTL.USER);
    }

    return user;
  }
}
