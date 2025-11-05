// CJS proxy to the JS build of the UserStore used by tests
const RealUserStore = require("../user-store.js");

class UserStore {
	constructor(dbOrRepo, cache) {
		if (dbOrRepo && typeof dbOrRepo.create === "function") {
			this._repo = dbOrRepo;
			this._isRepo = true;
		} else {
			this._real = new RealUserStore(dbOrRepo, cache);
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

	async getByUsername(username) {
		if (this._isRepo && typeof this._repo.getByUsername === "function")
			return this._repo.getByUsername(username);
		return this._real.getByUsername ? this._real.getByUsername(username) : null;
	}

	async getByEmail(email) {
		if (this._isRepo && typeof this._repo.getByEmail === "function")
			return this._repo.getByEmail(email);
		return this._real.getByEmail ? this._real.getByEmail(email) : null;
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
		return this._real.getAll ? this._real.getAll(...args) : { users: [] };
	}

	async validateUserData(data) {
		if (this._isRepo && typeof this._repo.validateUserData === "function")
			return this._repo.validateUserData(data);
		return this._real.validateUserData
			? this._real.validateUserData(data)
			: true;
	}
}

module.exports = UserStore;
