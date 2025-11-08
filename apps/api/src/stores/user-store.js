const fs = require("fs").promises;
const path = require("path");

class UserStore {
	constructor(db, cache = null) {
		this.db = db;
		this.cache = cache;
		this.tableName = "users";
	}

	async create(userData) {
		const id = Date.now().toString();
		const user = {
			id,
			...userData,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		if (!this.db[this.tableName]) {
			this.db[this.tableName] = [];
		}
		this.db[this.tableName].push(user);

		return user;
	}

	async getById(id) {
		const users = this.db[this.tableName] || [];
		return users.find((user) => user.id === id) || null;
	}

	async getByEmail(email) {
		const users = this.db[this.tableName] || [];
		return users.find((user) => user.email === email) || null;
	}

	async getAll() {
		return this.db[this.tableName] || [];
	}

	async update(id, updates) {
		const users = this.db[this.tableName] || [];
		const index = users.findIndex((user) => user.id === id);

		if (index === -1) {
			return null;
		}

		users[index] = {
			...users[index],
			...updates,
			updatedAt: new Date().toISOString(),
		};

		return users[index];
	}

	async delete(id) {
		const users = this.db[this.tableName] || [];
		const index = users.findIndex((user) => user.id === id);

		if (index === -1) {
			return false;
		}

		users.splice(index, 1);
		return true;
	}
}

module.exports = { UserStore };
