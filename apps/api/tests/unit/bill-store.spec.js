import { describe, it, expect, beforeEach, vi } from "vitest";
import BillStore from "../stores/bill-store.js";

// Mock the database
vi.mock("../index.js", () => ({
	getDatabase: vi.fn(() => ({
		bills: {
			create: vi.fn(),
			getById: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			getAll: vi.fn(),
			getByStatus: vi.fn(),
		},
	})),
}));

describe("BillStore", () => {
	let store;
	let mockDb;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { getDatabase } = await import("../index.js");
		mockDb = getDatabase();
		store = new BillStore(mockDb.bills);
	});

	describe("create", () => {
		it("should create a new bill", async () => {
			const billData = {
				title: "Test Bill",
				description: "A test bill for testing",
				proposerId: "user-123",
				status: "proposed",
			};

			mockDb.bills.create.mockResolvedValue({
				id: "bill-123",
				...billData,
				createdAt: "2025-11-05T00:00:00Z",
				votes: { yes: 0, no: 0, abstain: 0 },
			});

			const result = await store.create(billData);

			expect(result).toHaveProperty("id", "bill-123");
			expect(result).toHaveProperty("title", "Test Bill");
			expect(result).toHaveProperty("status", "proposed");
			expect(result).toHaveProperty("votes", { yes: 0, no: 0, abstain: 0 });
			expect(mockDb.bills.create).toHaveBeenCalledWith(billData);
		});

		it("should handle database errors", async () => {
			mockDb.bills.create.mockRejectedValue(new Error("Database error"));

			await expect(store.create({})).rejects.toThrow("Database error");
		});
	});

	describe("getById", () => {
		it("should retrieve bill by ID", async () => {
			const mockBill = {
				id: "bill-123",
				title: "Test Bill",
				description: "A test bill",
				proposerId: "user-123",
				status: "proposed",
				votes: { yes: 5, no: 2, abstain: 1 },
			};

			mockDb.bills.getById.mockResolvedValue(mockBill);

			const result = await store.getById("bill-123");

			expect(result).toEqual(mockBill);
			expect(mockDb.bills.getById).toHaveBeenCalledWith("bill-123");
		});

		it("should return null for non-existent bill", async () => {
			mockDb.bills.getById.mockResolvedValue(null);

			const result = await store.getById("non-existent");

			expect(result).toBeNull();
		});
	});

	describe("update", () => {
		it("should update bill data", async () => {
			const updateData = {
				status: "passed",
				description: "Updated description",
			};

			mockDb.bills.update.mockResolvedValue({
				id: "bill-123",
				title: "Test Bill",
				status: "passed",
				description: "Updated description",
			});

			const result = await store.update("bill-123", updateData);

			expect(result).toHaveProperty("status", "passed");
			expect(result).toHaveProperty("description", "Updated description");
			expect(mockDb.bills.update).toHaveBeenCalledWith("bill-123", updateData);
		});
	});

	describe("delete", () => {
		it("should delete bill", async () => {
			mockDb.bills.delete.mockResolvedValue(true);

			const result = await store.delete("bill-123");

			expect(result).toBe(true);
			expect(mockDb.bills.delete).toHaveBeenCalledWith("bill-123");
		});
	});

	describe("getAll", () => {
		it("should retrieve all bills", async () => {
			const mockBills = [
				{ id: "bill-1", title: "Bill 1", status: "proposed" },
				{ id: "bill-2", title: "Bill 2", status: "passed" },
			];

			mockDb.bills.getAll.mockResolvedValue(mockBills);

			const result = await store.getAll();

			expect(result).toEqual(mockBills);
			expect(mockDb.bills.getAll).toHaveBeenCalled();
		});

		it("should support filtering by status", async () => {
			const mockBills = [{ id: "bill-1", title: "Bill 1", status: "proposed" }];

			mockDb.bills.getAll.mockResolvedValue(mockBills);

			const result = await store.getAll({ status: "proposed" });

			expect(result).toEqual(mockBills);
			expect(mockDb.bills.getAll).toHaveBeenCalledWith({ status: "proposed" });
		});
	});

	describe("getByStatus", () => {
		it("should retrieve bills by status", async () => {
			const mockBills = [
				{ id: "bill-1", title: "Bill 1", status: "proposed" },
				{ id: "bill-2", title: "Bill 2", status: "proposed" },
			];

			mockDb.bills.getByStatus.mockResolvedValue(mockBills);

			const result = await store.getByStatus("proposed");

			expect(result).toEqual(mockBills);
			expect(mockDb.bills.getByStatus).toHaveBeenCalledWith("proposed");
		});
	});

	describe("addVote", () => {
		it("should add yes vote to bill", async () => {
			const mockBill = {
				id: "bill-123",
				title: "Test Bill",
				votes: { yes: 5, no: 2, abstain: 1 },
			};

			mockDb.bills.getById.mockResolvedValue(mockBill);
			mockDb.bills.update.mockResolvedValue({
				...mockBill,
				votes: { yes: 6, no: 2, abstain: 1 },
			});

			const result = await store.addVote("bill-123", "user-456", "yes");

			expect(result.votes).toEqual({ yes: 6, no: 2, abstain: 1 });
			expect(mockDb.bills.update).toHaveBeenCalledWith("bill-123", {
				votes: { yes: 6, no: 2, abstain: 1 },
			});
		});

		it("should add no vote to bill", async () => {
			const mockBill = {
				id: "bill-123",
				title: "Test Bill",
				votes: { yes: 5, no: 2, abstain: 1 },
			};

			mockDb.bills.getById.mockResolvedValue(mockBill);
			mockDb.bills.update.mockResolvedValue({
				...mockBill,
				votes: { yes: 5, no: 3, abstain: 1 },
			});

			const result = await store.addVote("bill-123", "user-456", "no");

			expect(result.votes).toEqual({ yes: 5, no: 3, abstain: 1 });
		});

		it("should throw error for invalid vote type", async () => {
			await expect(
				store.addVote("bill-123", "user-456", "invalid"),
			).rejects.toThrow("Invalid vote type");
		});

		it("should throw error for non-existent bill", async () => {
			mockDb.bills.getById.mockResolvedValue(null);

			await expect(
				store.addVote("non-existent", "user-456", "yes"),
			).rejects.toThrow("Bill not found");
		});
	});

	describe("getVoteResults", () => {
		it("should calculate vote results", async () => {
			const mockBill = {
				id: "bill-123",
				title: "Test Bill",
				votes: { yes: 10, no: 5, abstain: 2 },
			};

			mockDb.bills.getById.mockResolvedValue(mockBill);

			const result = await store.getVoteResults("bill-123");

			expect(result).toHaveProperty("totalVotes", 17);
			expect(result).toHaveProperty("yes", 10);
			expect(result).toHaveProperty("no", 5);
			expect(result).toHaveProperty("abstain", 2);
			expect(result).toHaveProperty("percentYes");
			expect(result.percentYes).toBeCloseTo(58.82, 1);
		});

		it("should handle bills with no votes", async () => {
			const mockBill = {
				id: "bill-123",
				title: "Test Bill",
				votes: { yes: 0, no: 0, abstain: 0 },
			};

			mockDb.bills.getById.mockResolvedValue(mockBill);

			const result = await store.getVoteResults("bill-123");

			expect(result).toHaveProperty("totalVotes", 0);
			expect(result.percentYes).toBe(0);
		});
	});
});
