// CJS proxy to the JS build of the VoteStore used by tests
const RealVoteStore = require("../vote-store.js");

class VoteStore {
	constructor(dbOrRepo, cache) {
		if (dbOrRepo && typeof dbOrRepo.create === "function") {
			this._repo = dbOrRepo;
			this._isRepo = true;
		} else {
			this._real = new RealVoteStore(dbOrRepo, cache);
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

	async getByBillId(billId) {
		if (this._isRepo && typeof this._repo.getByBillId === "function") return this._repo.getByBillId(billId);
		return this._real.getByBillId ? this._real.getByBillId(billId) : [];
	}

	async getByUserId(userId) {
		if (this._isRepo && typeof this._repo.getByUserId === "function") return this._repo.getByUserId(userId);
		return this._real.getByUserId ? this._real.getByUserId(userId) : [];
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
		return this._real.getAll ? this._real.getAll(...args) : { votes: [] };
	}

	async hasUserVotedOnBill(userId, billId) {
		if (this._isRepo && typeof this._repo.hasUserVotedOnBill === "function") return this._repo.hasUserVotedOnBill(userId, billId);
		if (this._isRepo) {
			const votes = await this._repo.getByUserId(userId);
			return votes.some((v) => v.billId === billId);
		}
		return this._real.hasUserVotedOnBill ? this._real.hasUserVotedOnBill(userId, billId) : false;
	}

	async getVoteCounts(billId) {
		if (this._isRepo && typeof this._repo.getVoteCounts === "function") return this._repo.getVoteCounts(billId);
		// Fallback: compute from getByBillId
		const votes = await this.getByBillId(billId);
		const counts = { yes: 0, no: 0, abstain: 0 };
		for (const v of votes) {
			if (v.type === "yes") counts.yes += 1;
			else if (v.type === "no") counts.no += 1;
			else if (v.type === "abstain") counts.abstain += 1;
		}
		return counts;
	}

	async validateVoteData(data) {
		if (this._isRepo && typeof this._repo.validateVoteData === "function") return this._repo.validateVoteData(data);
		return this._real.validateVoteData ? this._real.validateVoteData(data) : true;
	}
}

module.exports = VoteStore;
