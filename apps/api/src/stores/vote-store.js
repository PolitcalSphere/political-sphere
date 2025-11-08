const fs = require("fs").promises;
const path = require("path");

class VoteStore {
	constructor(db, cache = null) {
		this.db = db;
		this.cache = cache;
		this.tableName = "votes";
	}

	async create(voteData) {
		const id = Date.now().toString();
		const vote = {
			id,
			...voteData,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		if (!this.db[this.tableName]) {
			this.db[this.tableName] = [];
		}
		this.db[this.tableName].push(vote);

		return vote;
	}

	async getById(id) {
		const votes = this.db[this.tableName] || [];
		return votes.find((vote) => vote.id === id) || null;
	}

	async getByBillId(billId) {
		const votes = this.db[this.tableName] || [];
		return votes.filter((vote) => vote.billId === billId);
	}

	async getByUserId(userId) {
		const votes = this.db[this.tableName] || [];
		return votes.filter((vote) => vote.userId === userId);
	}

	async getAll() {
		return this.db[this.tableName] || [];
	}

	async update(id, updates) {
		const votes = this.db[this.tableName] || [];
		const index = votes.findIndex((vote) => vote.id === id);

		if (index === -1) {
			return null;
		}

		votes[index] = {
			...votes[index],
			...updates,
			updatedAt: new Date().toISOString(),
		};

		return votes[index];
	}

	async delete(id) {
		const votes = this.db[this.tableName] || [];
		const index = votes.findIndex((vote) => vote.id === id);

		if (index === -1) {
			return false;
		}

		votes.splice(index, 1);
		return true;
	}
}

module.exports = { VoteStore };
