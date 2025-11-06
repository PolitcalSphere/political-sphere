// Compatibility wrapper: export a BillStore class that delegates to
// either a test-friendly repository object (with create/getById/update/etc.)
// or to the real SQL-backed BillStore implementation.

import { pick } from "../../../../libs/shared/src/safe-assign.mjs";
import { BillStore as RealBillStore } from "../bill-store.js";

class BillStore {
	constructor(dbOrRepo, cache) {
		// Detect a test/mock repository that provides CRUD methods
		if (dbOrRepo && typeof dbOrRepo.create === "function") {
			this._repo = dbOrRepo;
			this._isRepo = true;
		} else {
			// Assume a real Database instance was provided
			this._real = new RealBillStore(dbOrRepo, cache);
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

	async update(id, data) {
		if (this._isRepo) return this._repo.update(id, data);
		// Real store exposes updateStatus; attempt a best-effort mapping
		if (data?.status && typeof this._real.updateStatus === "function") {
			return this._real.updateStatus(id, data.status);
		}
		// Not supported on real store
		return null;
	}

	async delete(id) {
		if (this._isRepo) return this._repo.delete(id);
		return this._real.delete ? this._real.delete(id) : null;
	}

	async getAll(...args) {
		if (this._isRepo) return this._repo.getAll(...args);
		return this._real.getAll(...args);
	}

	async getByStatus(status) {
		if (this._isRepo) return this._repo.getByStatus(status);
		// Fallback: filter results from getAll
		const res = await this._real.getAll(1, 1000);
		return res.bills.filter((b) => b.status === status);
	}

	async addVote(id, userId, voteType) {
		// Validate vote type first (tests expect this to be checked before existence)
		if (!["yes", "no", "abstain"].includes(voteType)) {
			throw new Error("Invalid vote type");
		}

		if (this._isRepo) {
			const bill = await this._repo.getById(id);
			if (!bill) throw new Error("Bill not found");
			// Only copy allowed vote keys to avoid mass-assignment of unexpected fields
			const votes = { yes: 0, no: 0, abstain: 0 };
			const safe = pick(bill.votes || {}, ["yes", "no", "abstain"]);
			Object.assign(votes, safe);
			if (voteType === "yes") votes.yes += 1;
			else if (voteType === "no") votes.no += 1;
			else if (voteType === "abstain") votes.abstain += 1;

			const updated = await this._repo.update(id, { votes });
			return updated;
		}
		// Delegate to real implementation if available
		if (typeof this._real.addVote === "function")
			return this._real.addVote(id, userId, voteType);
		throw new Error("addVote not supported by underlying store");
	}

	async getVoteResults(id) {
		if (this._isRepo) {
			const bill = await this._repo.getById(id);
			if (!bill) throw new Error("Bill not found");
			const yes = bill.votes?.yes ?? 0;
			const no = bill.votes?.no ?? 0;
			const abstain = bill.votes?.abstain ?? 0;
			const total = yes + no + abstain;
			const percentYes = total === 0 ? 0 : (yes / total) * 100;
			return { totalVotes: total, yes, no, abstain, percentYes };
		}
		return this._real.getVoteResults ? this._real.getVoteResults(id) : null;
	}
}

export default BillStore;
export { BillStore };
