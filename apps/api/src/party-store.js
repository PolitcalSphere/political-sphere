const { v4: uuidv4 } = require("uuid");
const { cacheKeys, CACHE_TTL } = require("./cache");

class PartyStore {
	constructor(db, cache = null) {
		this.db = db;
		this.cache = cache;
	}

	async create(input) {
		const id = uuidv4();
		const now = new Date();
		const stmt = this.db.prepare(
			`INSERT INTO parties (id, name, description, color, created_at)
       VALUES (?, ?, ?, ?, ?)`,
		);
		stmt.run(id, input.name, input.description || null, input.color, now.toISOString());

		const party = {
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
				this.cache.del(cacheKeys.parties()),
			]);
		}

		return party;
	}

	async getById(id) {
		const cacheKey = cacheKeys.party(id);
		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const row = this.db
			.prepare(
				`SELECT id, name, description, color, created_at
         FROM parties
         WHERE id = ?`,
			)
			.get(id);

		if (!row) {
			return null;
		}

		const party = {
			id: row.id,
			name: row.name,
			description: row.description,
			color: row.color,
			createdAt: new Date(row.created_at),
		};

		if (this.cache) {
			await this.cache.set(cacheKey, party, CACHE_TTL.PARTY);
		}

		return party;
	}

	async getByName(name) {
		const cacheKey = cacheKeys.partyByName(name);
		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const row = this.db
			.prepare(
				`SELECT id, name, description, color, created_at
         FROM parties
         WHERE name = ?`,
			)
			.get(name);

		if (!row) {
			return null;
		}

		const party = {
			id: row.id,
			name: row.name,
			description: row.description,
			color: row.color,
			createdAt: new Date(row.created_at),
		};

		if (this.cache) {
			await Promise.all([
				this.cache.set(cacheKey, party, CACHE_TTL.PARTY),
				this.cache.set(cacheKeys.party(row.id), party, CACHE_TTL.PARTY),
			]);
		}

		return party;
	}

	async getAll() {
		const cacheKey = cacheKeys.parties();
		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const rows = this.db
			.prepare(
				`SELECT id, name, description, color, created_at
         FROM parties
         ORDER BY created_at DESC`,
			)
			.all();

		const totalRow = this.db
			.prepare(`SELECT COUNT(*) as count FROM parties`)
			.get();

		const parties = rows.map((row) => ({
			id: row.id,
			name: row.name,
			description: row.description,
			color: row.color,
			createdAt: new Date(row.created_at),
		}));

		const payload = {
			parties,
			total: totalRow?.count ?? parties.length,
		};

		if (this.cache) {
			await this.cache.set(cacheKey, payload, CACHE_TTL.PARTY_LIST);
		}

		return payload;
	}
}

module.exports = {
	PartyStore,
};
