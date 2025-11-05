// Compatibility wrapper for PartyStore so tests that pass a mock repo
// (with CRUD methods) continue to work without changing tests.
const RealPartyStore = require("../party-store.js");

class PartyStore {
	constructor(dbOrRepo, cache) {
		if (dbOrRepo && typeof dbOrRepo.create === "function") {
			this._repo = dbOrRepo;
			this._isRepo = true;
		} else {
			this._real = new RealPartyStore(dbOrRepo, cache);
			this._isRepo = false;
		}
	}

	async create(input) {
		if (this._isRepo) return this._repo.create(input);
		return this._real.create(input);
	}

	async getById(id) {
		if (this._isRepo) return this._repo.getById(id);
		return this._real.getById(id);
	}

	async getByName(name) {
		if (this._isRepo && typeof this._repo.getByName === "function") return this._repo.getByName(name);
		return this._real.getByName ? this._real.getByName(name) : null;
	}

	async update(id, data) {
		if (this._isRepo) return this._repo.update(id, data);
		return this._real.update ? this._real.update(id, data) : null;
	}

	async delete(id) {
		if (this._isRepo) return this._repo.delete(id);
		return this._real.delete ? this._real.delete(id) : null;
	}

	async getAll(...args) {
		if (this._isRepo) return this._repo.getAll(...args);
		return this._real.getAll ? this._real.getAll(...args) : { parties: [] };
	}
}

module.exports = PartyStore;
