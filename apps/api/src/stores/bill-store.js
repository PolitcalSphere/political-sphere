const fs = require("fs").promises;
const path = require("path");

class BillStore {
	constructor(db, cache = null) {
		this.db = db;
		this.cache = cache;
		this.tableName = "bills";
	}

	async create(billData) {
		const id = Date.now().toString();
		const bill = {
			id,
			...billData,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		// In a real implementation, this would use the database
		// For now, we'll use a simple in-memory store for testing
		if (!this.db[this.tableName]) {
			this.db[this.tableName] = [];
		}
		this.db[this.tableName].push(bill);

		return bill;
	}

	async getById(id) {
		const bills = this.db[this.tableName] || [];
		return bills.find((bill) => bill.id === id) || null;
	}

	async getAll() {
		return this.db[this.tableName] || [];
	}

	async update(id, updates) {
		const bills = this.db[this.tableName] || [];
		const index = bills.findIndex((bill) => bill.id === id);

		if (index === -1) {
			return null;
		}

		bills[index] = {
			...bills[index],
			...updates,
			updatedAt: new Date().toISOString(),
		};

		return bills[index];
	}

	async delete(id) {
		const bills = this.db[this.tableName] || [];
		const index = bills.findIndex((bill) => bill.id === id);

		if (index === -1) {
			return false;
		}

		bills.splice(index, 1);
		return true;
	}
}

module.exports = { BillStore };
