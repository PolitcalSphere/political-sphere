import { v4 as uuidv4 } from "uuid";
import { CACHE_TTL, cacheKeys } from "./cache.js";
import dbConnection from "./database-connection.js";

class BillStore {
	constructor(db = dbConnection.getConnection(), cache = null) {
		this.db = db;
		this.cache = cache;
	}

	async create(input) {
		const id = uuidv4();
		const now = new Date();

		const stmt = this.db.prepare(
			`INSERT INTO bills (id, title, description, proposer_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
		);

		stmt.run(
			id,
			input.title,
			input.description || null,
			input.proposerId,
			"proposed",
			now.toISOString(),
			now.toISOString(),
		);

		const bill = {
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
				this.cache.invalidatePattern("bills:*"),
				this.cache.del(cacheKeys.userBills(input.proposerId)),
			]);
		}

		return bill;
	}

	async getById(id) {
		if (this.cache) {
			const cached = await this.cache.get(cacheKeys.bill(id));
			if (cached) {
				return cached;
			}
		}

		const stmt = this.db.prepare(
			`SELECT id, title, description, proposer_id, status, created_at, updated_at
       FROM bills
       WHERE id = ?`,
		);
		const row = stmt.get(id);
		if (!row) {
			return null;
		}

		const bill = {
			id: row.id,
			title: row.title,
			description: row.description ?? undefined,
			proposerId: row.proposer_id,
			status: row.status,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		};

		if (this.cache) {
			await this.cache.set(cacheKeys.bill(id), bill, CACHE_TTL.BILL);
		}

		return bill;
	}

	async updateStatus(id, status) {
		const now = new Date();
		const stmt = this.db.prepare(
			`UPDATE bills
       SET status = ?, updated_at = ?
       WHERE id = ?
       RETURNING id, title, description, proposer_id, status, created_at, updated_at`,
		);
		const row = stmt.get(status, now.toISOString(), id);
		if (!row) {
			// Fallback for databases that don't support RETURNING
			const updateStmt = this.db.prepare(
				`UPDATE bills SET status = ?, updated_at = ? WHERE id = ?`,
			);
			const result = updateStmt.run
				? updateStmt.run(status, now.toISOString(), id)
				: { changes: 1 }; // Handle fake DB
			if (result.changes === 0) {
				return null;
			}
			// Fetch the updated bill
			return await this.getById(id);
		}

		const bill = {
			id: row.id,
			title: row.title,
			description: row.description ?? undefined,
			proposerId: row.proposer_id,
			status: row.status,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		};

		if (this.cache) {
			await Promise.all([
				this.cache.del(cacheKeys.bill(id)),
				this.cache.invalidatePattern("bills:*"),
			]);
		}

		return bill;
	}

	async getByProposerId(proposerId) {
		const cacheKey = cacheKeys.userBills(proposerId);

		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const rows = this.db
			.prepare(
				`SELECT id, title, description, proposer_id, status, created_at, updated_at
         FROM bills
         WHERE proposer_id = ?
         ORDER BY created_at DESC`,
			)
			.all(proposerId);

		const bills = rows.map((row) => ({
			id: row.id,
			title: row.title,
			description: row.description ?? undefined,
			proposerId: row.proposer_id,
			status: row.status,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		}));

		if (this.cache) {
			await this.cache.set(cacheKey, bills, CACHE_TTL.BILLS_LIST);
		}

		return bills;
	}

	async getAll(page = 1, limit = 10) {
		const cacheKey = cacheKeys.bills(page, limit);

		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const offset = (page - 1) * limit;
		const rows = this.db
			.prepare(
				`SELECT id, title, description, proposer_id, status, created_at, updated_at
         FROM bills
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
			)
			.all(limit, offset);

		const countRow = this.db
			.prepare(`SELECT COUNT(*) as count FROM bills`)
			.get();

		const result = {
			bills: rows.map((row) => ({
				id: row.id,
				title: row.title,
				description: row.description ?? undefined,
				proposerId: row.proposer_id,
				status: row.status,
				createdAt: new Date(row.created_at),
				updatedAt: new Date(row.updated_at),
			})),
			total: countRow.count,
		};

		if (this.cache) {
			await this.cache.set(cacheKey, result, CACHE_TTL.BILLS_LIST);
		}

		return result;
	}
}

export { BillStore };
