import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { Bill, CreateBillInput, BillStatus } from "@political-sphere/shared";
import { CacheService, cacheKeys, CACHE_TTL } from "../cache.js";
import { retryWithBackoff, DatabaseError } from "../error-handler.js";

interface BillRow {
  id: string;
  title: string;
  description: string | null;
  proposer_id: string;
  status: BillStatus | string;
  created_at: string;
  updated_at: string;
}

export class BillStore {
  constructor(private db: Database.Database, private cache?: CacheService) {}

  async create(input: CreateBillInput): Promise<Bill> {
    const id = uuidv4();
    const now = new Date();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO bills (id, title, description, proposer_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        input.title,
        input.description || null,
        input.proposerId,
        "proposed",
        now.toISOString(),
        now.toISOString(),
      );

      const bill: Bill = {
        id,
        title: input.title,
        description: input.description,
        proposerId: input.proposerId,
        status: "proposed",
        createdAt: now,
        updatedAt: now,
      };

      if (this.cache) {
        await Promise.all([
          this.cache.del(cacheKeys.bill(id)),
          this.cache.invalidatePattern('bills:*'),
          this.cache.del(cacheKeys.userBills(input.proposerId)),
        ]);
      }

      return bill;
    } catch (error) {
      throw new DatabaseError(`Failed to create bill: ${error.message}`);
    }
  }

  async getById(id: string): Promise<Bill | null> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<Bill>(cacheKeys.bill(id));
      if (cached) return cached;
    }

    try {
      return await retryWithBackoff(async () => {
        const row = this.db
          .prepare<[string], BillRow>(
            `SELECT id, title, description, proposer_id, status, created_at, updated_at FROM bills WHERE id = ?`,
          )
          .get(id) as BillRow | undefined;
        if (!row) return null;

        const bill = {
          id: row.id,
          title: row.title,
          description: row.description ?? undefined,
          proposerId: row.proposer_id,
          status: row.status as BillStatus,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };

        // Cache the result
        if (this.cache) {
          await this.cache.set(cacheKeys.bill(id), bill, CACHE_TTL.BILL);
        }

        return bill;
      });
    } catch (error) {
      throw new DatabaseError(`Failed to get bill ${id}: ${error.message}`);
    }
  }

  async updateStatus(id: string, status: BillStatus): Promise<Bill | null> {
    const now = new Date();

    try {
      const stmt = this.db.prepare<[BillStatus, string, string], BillRow>(
        `UPDATE bills
         SET status = ?, updated_at = ?
         WHERE id = ?
         RETURNING id, title, description, proposer_id, status, created_at, updated_at`,
      );

      const row = stmt.get(status, now.toISOString(), id);
      if (!row) return null;

      const bill = {
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        proposerId: row.proposer_id,
        status: row.status as BillStatus,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };

      // Invalidate cache
      if (this.cache) {
        await Promise.all([
          this.cache.del(cacheKeys.bill(id)),
          this.cache.invalidatePattern('bills:*'),
        ]);
      }

      return bill;
    } catch (error) {
      throw new DatabaseError(`Failed to update bill status ${id}: ${error.message}`);
    }
  }

  async getAll(page: number = 1, limit: number = 10): Promise<{ bills: Bill[]; total: number }> {
    const offset = (page - 1) * limit;

    // Try cache first
    const cacheKey = cacheKeys.bills(page, limit);
    if (this.cache) {
      const cached = await this.cache.get<{ bills: Bill[]; total: number }>(cacheKey);
      if (cached) return cached;
    }

    try {
      // Get total count
      const countStmt = this.db.prepare<[], { count: number }>(
        `SELECT COUNT(*) as count FROM bills`,
      );
      const total = countStmt.get().count;

      // Get paginated results
      const stmt = this.db.prepare<[number, number], BillRow>(
        `SELECT id, title, description, proposer_id, status, created_at, updated_at
         FROM bills
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      );

      const rows = stmt.all(limit, offset);
      const bills = rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        proposerId: row.proposer_id,
        status: row.status as BillStatus,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));

      const result = { bills, total };

      // Cache the result
      if (this.cache) {
        await this.cache.set(cacheKey, result, CACHE_TTL.BILLS_LIST);
      }

      return result;
    } catch (error) {
      throw new DatabaseError(`Failed to get bills: ${error.message}`);
    }
  }

  async getByProposerId(proposerId: string): Promise<Bill[]> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<Bill[]>(cacheKeys.userBills(proposerId));
      if (cached) return cached;
    }

    try {
      const stmt = this.db.prepare<[string], BillRow>(
        `SELECT id, title, description, proposer_id, status, created_at, updated_at
         FROM bills
         WHERE proposer_id = ?
         ORDER BY created_at DESC`,
      );

      const rows = stmt.all(proposerId);
      const bills = rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        proposerId: row.proposer_id,
        status: row.status as BillStatus,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));

      // Cache the result
      if (this.cache) {
        await this.cache.set(cacheKeys.userBills(proposerId), bills, CACHE_TTL.BILLS_LIST);
      }

      return bills;
    } catch (error) {
      throw new DatabaseError(`Failed to get bills for proposer ${proposerId}: ${error.message}`);
    }
  }
}
