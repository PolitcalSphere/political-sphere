import type { CreateVoteInput, Vote, VoteType } from "@political-sphere/shared";
import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { CACHE_TTL, type CacheService, cacheKeys } from "../../utils/cache.js";
import { DatabaseError, retryWithBackoff } from "../../utils/error-handler.js";

interface VoteRow {
  id: string;
  bill_id: string;
  user_id: string;
  vote: VoteType | string;
  created_at: string;
}

interface VoteCountRow {
  aye: number | null;
  nay: number | null;
  abstain: number | null;
}

export class VoteStore {
  constructor(private db: Database.Database, private cache?: CacheService) {}

  async create(input: CreateVoteInput): Promise<Vote> {
    const id = uuidv4();
    const now = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO votes (id, bill_id, user_id, vote, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, input.billId, input.userId, input.vote, now.toISOString());

    const vote: Vote = {
      id,
      billId: input.billId,
      userId: input.userId,
      vote: input.vote,
      createdAt: now,
    };

    if (this.cache) {
      await Promise.all([
        this.cache.del(cacheKeys.billVotes(input.billId)),
        this.cache.del(cacheKeys.userVotes(input.userId)),
        this.cache.del(`bill:${input.billId}:voteCounts`),
      ]);
    }

    return vote;
  }

  async getById(id: string): Promise<Vote | null> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<Vote>(cacheKeys.vote(id));
      if (cached) return cached;
    }

    try {
      return await retryWithBackoff(async () => {
        const row = this.db
          .prepare<[string], VoteRow>(
            `SELECT id, bill_id, user_id, vote, created_at FROM votes WHERE id = ?`
          )
          .get(id);
        if (!row) return null;

        const vote = {
          id: row.id,
          billId: row.bill_id,
          userId: row.user_id,
          vote: row.vote as VoteType,
          createdAt: new Date(row.created_at),
        };

        // Cache the result
        if (this.cache) {
          await this.cache.set(cacheKeys.vote(id), vote, CACHE_TTL.VOTES);
        }

        return vote;
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to get vote ${id}: ${(error as Error).message}`
      );
    }
  }

  async getByBillId(billId: string): Promise<Vote[]> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<Vote[]>(
        cacheKeys.votesByBill(billId)
      );
      if (cached) return cached;
    }

    try {
      return await retryWithBackoff(async () => {
        const stmt = this.db.prepare<[string], VoteRow>(
          `SELECT id, bill_id, user_id, vote, created_at FROM votes WHERE bill_id = ? ORDER BY created_at DESC`
        );
        const rows = stmt.all(billId);
        const votes = rows.map((row) => ({
          id: row.id,
          billId: row.bill_id,
          userId: row.user_id,
          vote: row.vote as VoteType,
          createdAt: new Date(row.created_at),
        }));

        // Cache the result
        if (this.cache) {
          await this.cache.set(
            cacheKeys.votesByBill(billId),
            votes,
            CACHE_TTL.VOTES
          );
        }

        return votes;
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to get votes for bill ${billId}: ${(error as Error).message}`
      );
    }
  }

  async getByUserId(userId: string): Promise<Vote[]> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<Vote[]>(
        cacheKeys.votesByUser(userId)
      );
      if (cached) return cached;
    }

    try {
      return await retryWithBackoff(async () => {
        const stmt = this.db.prepare<[string], VoteRow>(
          `SELECT id, bill_id, user_id, vote, created_at FROM votes WHERE user_id = ? ORDER BY created_at DESC`
        );
        const rows = stmt.all(userId);
        const votes = rows.map((row) => ({
          id: row.id,
          billId: row.bill_id,
          userId: row.user_id,
          vote: row.vote as VoteType,
          createdAt: new Date(row.created_at),
        }));

        // Cache the result
        if (this.cache) {
          await this.cache.set(
            cacheKeys.votesByUser(userId),
            votes,
            CACHE_TTL.VOTES
          );
        }

        return votes;
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to get votes for user ${userId}: ${(error as Error).message}`
      );
    }
  }

  async hasUserVotedOnBill(userId: string, billId: string): Promise<boolean> {
    try {
      return await retryWithBackoff(async () => {
        const stmt = this.db.prepare<
          [string, string],
          { count: number | null }
        >(
          `SELECT COUNT(*) as count FROM votes WHERE user_id = ? AND bill_id = ?`
        );
        const row = stmt.get(userId, billId);
        return (row?.count ?? 0) > 0;
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to check vote for user ${userId} on bill ${billId}: ${
          (error as Error).message
        }`
      );
    }
  }

  async getVoteCounts(
    billId: string
  ): Promise<{ aye: number; nay: number; abstain: number }> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<{
        aye: number;
        nay: number;
        abstain: number;
      }>(`bill:${billId}:voteCounts`);
      if (cached) return cached;
    }

    try {
      return await retryWithBackoff(async () => {
        const stmt = this.db.prepare<[string], VoteCountRow>(
          `SELECT
            SUM(CASE WHEN vote = 'aye' THEN 1 ELSE 0 END) as aye,
            SUM(CASE WHEN vote = 'nay' THEN 1 ELSE 0 END) as nay,
            SUM(CASE WHEN vote = 'abstain' THEN 1 ELSE 0 END) as abstain
          FROM votes
          WHERE bill_id = ?`
        );

        const row = stmt.get(billId) ?? { aye: 0, nay: 0, abstain: 0 };
        const counts = {
          aye: row.aye ?? 0,
          nay: row.nay ?? 0,
          abstain: row.abstain ?? 0,
        };

        // Cache the result
        if (this.cache) {
          await this.cache.set(
            `bill:${billId}:voteCounts`,
            counts,
            CACHE_TTL.VOTES
          );
        }

        return counts;
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to get vote counts for bill ${billId}: ${
          (error as Error).message
        }`
      );
    }
  }
}
