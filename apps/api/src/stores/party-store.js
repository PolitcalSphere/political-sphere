const fs = require("fs").promises;
const path = require("path");

class PartyStore {
	constructor(db, cache = null) {
		this.db = db;
		this.cache = cache;
		this.tableName = "parties";
	}

	async create(partyData) {
		const id = Date.now().toString();
		const party = {
			id,
			...partyData,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		if (!this.db[this.tableName]) {
			this.db[this.tableName] = [];
		}
		this.db[this.tableName].push(party);

		return party;
	}

	async getById(id) {
		const parties = this.db[this.tableName] || [];
		return parties.find((party) => party.id === id) || null;
	}

	async getAll() {
		return this.db[this.tableName] || [];
	}

	async update(id, updates) {
		const parties = this.db[this.tableName] || [];
		const index = parties.findIndex((party) => party.id === id);

		if (index === -1) {
			return null;
		}

		parties[index] = {
			...parties[index],
			...updates,
			updatedAt: new Date().toISOString(),
		};

		return parties[index];
	}

	async delete(id) {
		const parties = this.db[this.tableName] || [];
		const index = parties.findIndex((party) => party.id === id);

		if (index === -1) {
			return false;
		}

		parties.splice(index, 1);
		return true;
	}
}

module.exports = { PartyStore };
