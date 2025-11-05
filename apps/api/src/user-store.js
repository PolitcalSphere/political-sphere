const { v4: uuidv4 } = require("uuid");
const { cacheKeys, CACHE_TTL } = require("./cache");

class UserStore {
	constructor(db, cache = null) {
		this.db = db;
		this.cache = cache;
	}

	async create(input) {
		const id = uuidv4();
		const now = new Date();
		const stmt = this.db.prepare(
			`INSERT INTO users (id, username, email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
		);

		stmt.run(
			id,
			input.username,
			input.email,
			now.toISOString(),
			now.toISOString(),
		);

		const user = {
			id,
			username: input.username,
			email: input.email,
			createdAt: now,
			updatedAt: now,
		};

		if (this.cache) {
			await Promise.all([
				this.cache.del(cacheKeys.user(id)),
				this.cache.del(cacheKeys.userByUsername(input.username)),
				this.cache.del(cacheKeys.userByEmail(input.email)),
			]);
			await Promise.all([
				this.cache.set(cacheKeys.user(id), user, CACHE_TTL.USER),
				this.cache.set(
					cacheKeys.userByUsername(input.username),
					user,
					CACHE_TTL.USER,
				),
				this.cache.set(
					cacheKeys.userByEmail(input.email),
					user,
					CACHE_TTL.USER,
				),
			]);
		}

		return user;
	}

	async getById(id) {
		const cacheKey = cacheKeys.user(id);
		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const row = this.db
			.prepare(
				`SELECT id, username, email, created_at, updated_at
         FROM users
         WHERE id = ?`,
			)
			.get(id);

		if (!row) {
			return null;
		}

		const user = {
			id: row.id,
			username: row.username,
			email: row.email,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		};

		if (this.cache) {
			await this.cache.set(cacheKey, user, CACHE_TTL.USER);
		}

		return user;
	}

	async getByUsername(username) {
		const cacheKey = cacheKeys.userByUsername(username);
		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const row = this.db
			.prepare(
				`SELECT id, username, email, created_at, updated_at
         FROM users
         WHERE username = ?`,
			)
			.get(username);

		if (!row) {
			return null;
		}

		const user = {
			id: row.id,
			username: row.username,
			email: row.email,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		};

		if (this.cache) {
			await this.cache.set(cacheKey, user, CACHE_TTL.USER);
			await this.cache.set(cacheKeys.user(row.id), user, CACHE_TTL.USER);
		}

		return user;
	}

	async getByEmail(email) {
		const cacheKey = cacheKeys.userByEmail(email);
		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const row = this.db
			.prepare(
				`SELECT id, username, email, created_at, updated_at
         FROM users
         WHERE email = ?`,
			)
			.get(email);

		if (!row) {
			return null;
		}

		const user = {
			id: row.id,
			username: row.username,
			email: row.email,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		};

		if (this.cache) {
			await this.cache.set(cacheKey, user, CACHE_TTL.USER);
			await this.cache.set(cacheKeys.user(row.id), user, CACHE_TTL.USER);
		}

		return user;
	}

	async update(id, updates) {
		const now = new Date();
		const fields = [];
		const values = [];

		// Build dynamic update query
		if (updates.username !== undefined) {
			fields.push("username = ?");
			values.push(updates.username);
		}
		if (updates.email !== undefined) {
			fields.push("email = ?");
			values.push(updates.email);
		}
		if (updates.deletedAt !== undefined) {
			fields.push("deleted_at = ?");
			values.push(updates.deletedAt);
		}
		if (updates.deletionReason !== undefined) {
			fields.push("deletion_reason = ?");
			values.push(updates.deletionReason);
		}
		if (updates.deletedBy !== undefined) {
			fields.push("deleted_by = ?");
			values.push(updates.deletedBy);
		}

		if (fields.length === 0) {
			throw new Error("No fields to update");
		}

		fields.push("updated_at = ?");
		values.push(now.toISOString());
		values.push(id);

		const stmt = this.db.prepare(
			`UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
		);
		const result = stmt.run(...values);

		if (result.changes === 0) {
			return null;
		}

		// Invalidate cache
		if (this.cache) {
			await this.cache.del(cacheKeys.user(id));
			// Also invalidate by username/email if they were updated
			if (updates.username) {
				await this.cache.del(cacheKeys.userByUsername(updates.username));
			}
			if (updates.email) {
				await this.cache.del(cacheKeys.userByEmail(updates.email));
			}
		}

		// Return updated user
		return this.getById(id);
	}
}

module.exports = {
	UserStore,
};
