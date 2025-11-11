import type { CreatePartyInput, Party } from '@political-sphere/shared';
import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

import { CACHE_TTL, type CacheService, cacheKeys } from '../../utils/cache.js'; // eslint-disable-line no-restricted-imports
import { DatabaseError, retryWithBackoff } from '../../utils/error-handler.js'; // eslint-disable-line no-restricted-imports

interface PartyRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export class PartyStore {
  constructor(
    private db: Database.Database,
    private cache?: CacheService
  ) {}

  async create(input: CreatePartyInput): Promise<Party> {
    const id = uuidv4();
    const now = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO parties (id, name, description, color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, input.name, input.description || null, input.color, now.toISOString());

    const party: Party = {
      id,
      name: input.name,
      description: input.description,
      color: input.color,
      createdAt: now,
    };

    if (this.cache) {
      await Promise.all([
        this.cache.del(cacheKeys.party(id)),
        this.cache.del(cacheKeys.partyByName(input.name)),
        this.cache.invalidatePattern('parties:list:*'),
      ]);
    }

    return party;
  }

  async getById(id: string): Promise<Party | null> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<Party>(cacheKeys.party(id));
      if (cached) return cached;
    }

    try {
      return await retryWithBackoff(async () => {
        const row = this.db
          .prepare<
            [string],
            PartyRow
          >(`SELECT id, name, description, color, created_at FROM parties WHERE id = ?`)
          .get(id);
        if (!row) return null;

        const party = {
          id: row.id,
          name: row.name,
          description: row.description ?? undefined,
          color: row.color,
          createdAt: new Date(row.created_at),
        };

        // Cache the result
        if (this.cache) {
          await this.cache.set(cacheKeys.party(id), party, CACHE_TTL.PARTY);
        }

        return party;
      });
    } catch (error) {
      throw new DatabaseError(`Failed to get party ${id}: ${(error as Error).message}`);
    }
  }
  async getByName(name: string): Promise<Party | null> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<Party>(cacheKeys.partyByName(name));
      if (cached) return cached;
    }

    try {
      return await retryWithBackoff(async () => {
        const row = this.db
          .prepare<
            [string],
            PartyRow
          >(`SELECT id, name, description, color, created_at FROM parties WHERE name = ?`)
          .get(name);
        if (!row) return null;

        const party = {
          id: row.id,
          name: row.name,
          description: row.description ?? undefined,
          color: row.color,
          createdAt: new Date(row.created_at),
        };

        // Cache the result
        if (this.cache) {
          await this.cache.set(cacheKeys.partyByName(name), party, CACHE_TTL.PARTY);
        }

        return party;
      });
    } catch (error) {
      throw new DatabaseError(`Failed to get party by name ${name}: ${(error as Error).message}`);
    }
  }

  async getAll(page: number = 1, limit: number = 10): Promise<{ parties: Party[]; total: number }> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<{ parties: Party[]; total: number }>(cacheKeys.parties());
      if (cached) return cached;
    }

    try {
      return await retryWithBackoff(async () => {
        const offset = (page - 1) * limit;

        // Get total count
        const countStmt = this.db.prepare<[], { count: number }>(
          `SELECT COUNT(*) as count FROM parties`
        );
        const total = countStmt.get()?.count ?? 0;

        // Get paginated results
        const stmt = this.db.prepare<[number, number], PartyRow>(
          `SELECT id, name, description, color, created_at FROM parties ORDER BY created_at DESC LIMIT ? OFFSET ?`
        );
        const rows = stmt.all(limit, offset);
        const parties = rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description ?? undefined,
          color: row.color,
          createdAt: new Date(row.created_at),
        }));

        const result = { parties, total };

        // Cache the result
        if (this.cache) {
          await this.cache.set(cacheKeys.parties(), result, CACHE_TTL.PARTY);
        }

        return result;
      });
    } catch (error) {
      throw new DatabaseError(`Failed to get all parties: ${(error as Error).message}`);
    }
  }
}
