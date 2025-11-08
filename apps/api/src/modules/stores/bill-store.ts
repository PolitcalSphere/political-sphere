import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { CACHE_TTL, type CacheService, cacheKeys } from "../cache.js";
import { DatabaseError, retryWithBackoff } from "../error-handler.js";

export class BillStore {
  constructor(private db: Database.Database, private cache?: CacheService) {}

  async create(billData: any) {
    return retryWithBackoff(async () => {
      const id = uuidv4();
      const now = new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO bills (id, title, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        billData.title,
        billData.description,
        billData.status || "draft",
        now,
        now
      );

      // Invalidate cache
      if (this.cache) {
        await this.cache.del(cacheKeys.bills());
      }

      return { id, ...billData, createdAt: now, updatedAt: now };
    });
  }

  async getById(id: string) {
    return retryWithBackoff(async () => {
      // Check cache first
      if (this.cache) {
        const cached = await this.cache.get(cacheKeys.bill(id));
        if (cached) return JSON.parse(cached);
      }

      const stmt = this.db.prepare("SELECT * FROM bills WHERE id = ?");
      const bill = stmt.get(id);

      if (bill && this.cache) {
        await this.cache.set(
          cacheKeys.bill(id),
          JSON.stringify(bill),
          CACHE_TTL
        );
      }

      return bill;
    });
  }

  async getAll() {
    return retryWithBackoff(async () => {
      // Check cache first
      if (this.cache) {
        const cached = await this.cache.get(cacheKeys.bills());
        if (cached) return JSON.parse(cached);
      }

      const stmt = this.db.prepare(
        "SELECT * FROM bills ORDER BY created_at DESC"
      );
      const bills = stmt.all();

      if (this.cache) {
        await this.cache.set(
          cacheKeys.bills(),
          JSON.stringify(bills),
          CACHE_TTL
        );
      }

      return bills;
    });
  }

  async update(id: string, updates: any) {
    return retryWithBackoff(async () => {
      const now = new Date().toISOString();

      const setClause = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = [...Object.values(updates), now, id];

      const stmt = this.db.prepare(`
        UPDATE bills SET ${setClause}, updated_at = ? WHERE id = ?
      `);

      const result = stmt.run(values);

      if (result.changes === 0) {
        return null;
      }

      // Invalidate cache
      if (this.cache) {
        await this.cache.del(cacheKeys.bill(id));
        await this.cache.del(cacheKeys.bills());
      }

      return this.getById(id);
    });
  }

  async delete(id: string) {
    return retryWithBackoff(async () => {
      const stmt = this.db.prepare("DELETE FROM bills WHERE id = ?");
      const result = stmt.run(id);

      // Invalidate cache
      if (this.cache) {
        await this.cache.del(cacheKeys.bill(id));
        await this.cache.del(cacheKeys.bills());
      }

      return result.changes > 0;
    });
  }
}
