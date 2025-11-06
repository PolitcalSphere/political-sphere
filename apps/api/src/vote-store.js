import { v4 as uuidv4 } from "uuid";
import { CACHE_TTL, cacheKeys } from "./cache.js";

class VoteStore {
	constructor(db, cache = null) {
		this.db = db;
		this.cache = cache;
	}

	async create(input) {
		const id = uuidv4();
		const now = new Date();
		const stmt = this.db.prepare(
			`INSERT INTO votes (id, bill_id, user_id, vote, created_at)
       VALUES (?, ?, ?, ?, ?)`,
		);
		stmt.run(id, input.billId, input.userId, input.vote, now.toISOString());

		if (this.cache) {
			await Promise.all([
				this.cache.del(cacheKeys.vote(id)),
				this.cache.del(cacheKeys.votesByBill(input.billId)),
				this.cache.del(cacheKeys.votesByUser(input.userId)),
				this.cache.del(cacheKeys.userVotes(input.userId)),
				this.cache.del(cacheKeys.billVotes(input.billId)),
			]);
		}

		return {
			id,
			billId: input.billId,
			userId: input.userId,
			vote: input.vote,
			createdAt: now,
		};
	}

	async getById(id) {
		const row = this.db
			.prepare(
				`SELECT id, bill_id, user_id, vote, created_at
         FROM votes
         WHERE id = ?`,
			)
			.get(id);

		if (!row) {
			return null;
		}

		return {
			id: row.id,
			billId: row.bill_id,
			userId: row.user_id,
			vote: row.vote,
			createdAt: new Date(row.created_at),
		};
	}

	async getByBillId(billId) {
		const cacheKey = cacheKeys.votesByBill(billId);
		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const rows = this.db
			.prepare(
				`SELECT id, bill_id, user_id, vote, created_at
         FROM votes
         WHERE bill_id = ?
         ORDER BY created_at DESC`,
			)
			.all(billId);

		const votes = rows.map((row) => ({
			id: row.id,
			billId: row.bill_id,
			userId: row.user_id,
			vote: row.vote,
			createdAt: new Date(row.created_at),
		}));

		if (this.cache) {
			await this.cache.set(cacheKey, votes, CACHE_TTL.VOTES);
		}

		return votes;
	}

	async getByUserId(userId) {
		const cacheKey = cacheKeys.votesByUser(userId);
		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const rows = this.db
			.prepare(
				`SELECT id, bill_id, user_id, vote, created_at
         FROM votes
         WHERE user_id = ?
         ORDER BY created_at DESC`,
			)
			.all(userId);

		const votes = rows.map((row) => ({
			id: row.id,
			billId: row.bill_id,
			userId: row.user_id,
			vote: row.vote,
			createdAt: new Date(row.created_at),
		}));

		if (this.cache) {
			await this.cache.set(cacheKey, votes, CACHE_TTL.VOTES);
		}

		return votes;
	}

	hasUserVotedOnBill(userId, billId) {
		const row = this.db
			.prepare(
				`SELECT COUNT(*) as count
         FROM votes
         WHERE user_id = ? AND bill_id = ?`,
			)
			.get(userId, billId);

		return row.count > 0;
	}

	async getVoteCounts(billId) {
		const cacheKey = cacheKeys.billVotes(billId);
		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const row = this.db
			.prepare(
				`SELECT
         SUM(CASE WHEN vote = 'aye' THEN 1 ELSE 0 END) as aye,
         SUM(CASE WHEN vote = 'nay' THEN 1 ELSE 0 END) as nay,
         SUM(CASE WHEN vote = 'abstain' THEN 1 ELSE 0 END) as abstain
       FROM votes
       WHERE bill_id = ?`,
			)
			.get(billId);

		const counts = {
			aye: row?.aye || 0,
			nay: row?.nay || 0,
			abstain: row?.abstain || 0,
		};

		if (this.cache) {
			await this.cache.set(cacheKey, counts, CACHE_TTL.VOTES);
		}

		return counts;
	}
}

export { VoteStore };
