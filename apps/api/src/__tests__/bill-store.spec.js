import { beforeEach, describe, expect, it } from "vitest";
import { BillStore } from "../bill-store.js";

// Lightweight in-memory fake DB to emulate better-sqlite3 prepare/get/run/all
function createFakeDb() {
	const bills = [];
	return {
		prepare(sql) {
			const up = sql.trim().toUpperCase();
			if (up.startsWith("INSERT")) {
				return {
					run(...args) {
						// args: id, title, description, proposerId, status, created_at, updated_at
						const [
							id,
							title,
							description,
							proposerId,
							status,
							created_at,
							updated_at,
						] = args;
						bills.push({
							id,
							title,
							description,
							proposer_id: proposerId,
							status,
							created_at,
							updated_at,
						});
						return { changes: 1 };
					},
				};
			}

			if (up.includes("WHERE ID = ?")) {
				return {
					get(id) {
						return bills.find((b) => b.id === id) || null;
					},
				};
			}

			if (up.includes("WHERE PROPOSER_ID = ?")) {
				return {
					all(proposerId) {
						return bills.filter((b) => b.proposer_id === proposerId);
					},
				};
			}

			if (up.startsWith("UPDATE")) {
				return {
					get(status, updated_at, id) {
						const idx = bills.findIndex((b) => b.id === id);
						if (idx === -1) return null;
						bills[idx].status = status;
						bills[idx].updated_at = updated_at;
						return {
							id: bills[idx].id,
							title: bills[idx].title,
							description: bills[idx].description,
							proposer_id: bills[idx].proposer_id,
							status: bills[idx].status,
							created_at: bills[idx].created_at,
							updated_at: bills[idx].updated_at,
						};
					},
				};
			}

			if (up.includes("COUNT(*)")) {
				return {
					get() {
						return { count: bills.length };
					},
				};
			}

			// default: select all
			return {
				all() {
					return bills.slice();
				},
			};
		},
	};
}

describe("BillStore (in-memory DB)", () => {
	let store;

	beforeEach(() => {
		const db = createFakeDb();
		store = new BillStore(db, null);
	});

	it("creates a bill and returns expected shape", async () => {
		const input = {
			title: "Test bill",
			description: "desc",
			proposerId: "user-1",
		};
		const created = await store.create(input);
		expect(created).toHaveProperty("id");
		expect(created.title).toBe("Test bill");
		expect(created.proposerId).toBe("user-1");
		expect(created.status).toBe("proposed");
	});

	it("can retrieve a bill by id", async () => {
		const input = { title: "Find me", proposerId: "p1" };
		const created = await store.create(input);
		const fetched = await store.getById(created.id);
		expect(fetched).not.toBeNull();
		expect(fetched.id).toBe(created.id);
		expect(fetched.title).toBe("Find me");
	});

	it("returns all bills and by proposer id", async () => {
		await store.create({ title: "A", proposerId: "x" });
		await store.create({ title: "B", proposerId: "y" });
		const all = await store.getAll();
		expect(all).toHaveProperty("bills");
		expect(all.bills.length).toBeGreaterThanOrEqual(2);
		const byX = await store.getByProposerId("x");
		expect(byX.length).toBe(1);
		expect(byX[0].title).toBe("A");
	});

	it("updates status and invalidates caches (no cache provided)", async () => {
		const created = await store.create({ title: "Change me", proposerId: "z" });
		const updated = await store.updateStatus(created.id, "passed");
		// Since fake DB doesn't support RETURNING, updated will be the fetched bill after update
		expect(updated).not.toBeNull();
		expect(updated.status).toBe("passed");
		expect(updated.title).toBe("Change me");
		expect(updated.proposerId).toBe("z");
		// Verify the update worked by checking the in-memory array directly
		const bill = bills.find((b) => b.id === created.id);
		expect(bill.status).toBe("passed");
	});
});
