import { beforeEach, describe, expect, it, vi } from "vitest";
import VoteStore from "../stores/vote-store.js";

// Mock the database
vi.mock("../index.js", () => ({
	getDatabase: vi.fn(() => ({
		votes: {
			create: vi.fn(),
			getById: vi.fn(),
			getByBillId: vi.fn(),
			getByUserId: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			getAll: vi.fn(),
		},
	})),
}));

describe("VoteStore", () => {
	let store;
	let mockDb;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { getDatabase } = await import("../modules/stores/index.js");
		mockDb = getDatabase();
		store = new VoteStore(mockDb.votes);
	});

	describe("create", () => {
		it("should create a new vote", async () => {
			const voteData = {
				billId: "bill-123",
				userId: "user-456",
				vote: "yes",
			};

			mockDb.votes.create.mockResolvedValue({
				id: "vote-123",
				...voteData,
				timestamp: "2025-11-05T00:00:00Z",
			});

			const result = await store.create(voteData);

			expect(result).toHaveProperty("id", "vote-123");
			expect(result).toHaveProperty("billId", "bill-123");
			expect(result).toHaveProperty("userId", "user-456");
			expect(result).toHaveProperty("vote", "yes");
			expect(mockDb.votes.create).toHaveBeenCalledWith(voteData);
		});

		it("should handle database errors", async () => {
			mockDb.votes.create.mockRejectedValue(new Error("Database error"));

			await expect(store.create({})).rejects.toThrow("Database error");
		});
	});

	describe("getById", () => {
		it("should retrieve vote by ID", async () => {
			const mockVote = {
				id: "vote-123",
				billId: "bill-123",
				userId: "user-456",
				vote: "yes",
				timestamp: "2025-11-05T00:00:00Z",
			};

			mockDb.votes.getById.mockResolvedValue(mockVote);

			const result = await store.getById("vote-123");

			expect(result).toEqual(mockVote);
			expect(mockDb.votes.getById).toHaveBeenCalledWith("vote-123");
		});

		it("should return null for non-existent vote", async () => {
			mockDb.votes.getById.mockResolvedValue(null);

			const result = await store.getById("non-existent");

			expect(result).toBeNull();
		});
	});

	describe("getByBillId", () => {
		it("should retrieve votes by bill ID", async () => {
			const mockVotes = [
				{
					id: "vote-1",
					billId: "bill-123",
					userId: "user-456",
					vote: "yes",
				},
				{
					id: "vote-2",
					billId: "bill-123",
					userId: "user-789",
					vote: "no",
				},
			];

			mockDb.votes.getByBillId.mockResolvedValue(mockVotes);

			const result = await store.getByBillId("bill-123");

			expect(result).toEqual(mockVotes);
			expect(mockDb.votes.getByBillId).toHaveBeenCalledWith("bill-123");
		});
	});

	describe("getByUserId", () => {
		it("should retrieve votes by user ID", async () => {
			const mockVotes = [
				{
					id: "vote-1",
					billId: "bill-123",
					userId: "user-456",
					vote: "yes",
				},
				{
					id: "vote-2",
					billId: "bill-789",
					userId: "user-456",
					vote: "no",
				},
			];

			mockDb.votes.getByUserId.mockResolvedValue(mockVotes);

			const result = await store.getByUserId("user-456");

			expect(result).toEqual(mockVotes);
			expect(mockDb.votes.getByUserId).toHaveBeenCalledWith("user-456");
		});
	});

	describe("update", () => {
		it("should update vote data", async () => {
			const updateData = {
				vote: "no", // changing vote
			};

			mockDb.votes.update.mockResolvedValue({
				id: "vote-123",
				billId: "bill-123",
				userId: "user-456",
				vote: "no",
				timestamp: "2025-11-05T00:00:00Z",
			});

			const result = await store.update("vote-123", updateData);

			expect(result).toHaveProperty("vote", "no");
			expect(mockDb.votes.update).toHaveBeenCalledWith("vote-123", updateData);
		});
	});

	describe("delete", () => {
		it("should delete vote", async () => {
			mockDb.votes.delete.mockResolvedValue(true);

			const result = await store.delete("vote-123");

			expect(result).toBe(true);
			expect(mockDb.votes.delete).toHaveBeenCalledWith("vote-123");
		});
	});

	describe("getAll", () => {
		it("should retrieve all votes", async () => {
			const mockVotes = [
				{ id: "vote-1", billId: "bill-1", vote: "yes" },
				{ id: "vote-2", billId: "bill-2", vote: "no" },
			];

			mockDb.votes.getAll.mockResolvedValue(mockVotes);

			const result = await store.getAll();

			expect(result).toEqual(mockVotes);
			expect(mockDb.votes.getAll).toHaveBeenCalled();
		});

		it("should support filtering", async () => {
			const mockVotes = [{ id: "vote-1", billId: "bill-1", vote: "yes" }];

			mockDb.votes.getAll.mockResolvedValue(mockVotes);

			const result = await store.getAll({ billId: "bill-1" });

			expect(result).toEqual(mockVotes);
			expect(mockDb.votes.getAll).toHaveBeenCalledWith({ billId: "bill-1" });
		});
	});

	describe("hasUserVotedOnBill", () => {
		it("should return true if user has voted on bill", async () => {
			mockDb.votes.getByBillId.mockResolvedValue([
				{ id: "vote-1", userId: "user-456", billId: "bill-123" },
			]);

			const result = await store.hasUserVotedOnBill("user-456", "bill-123");

			expect(result).toBe(true);
			expect(mockDb.votes.getByBillId).toHaveBeenCalledWith("bill-123");
		});

		it("should return false if user has not voted on bill", async () => {
			mockDb.votes.getByBillId.mockResolvedValue([
				{ id: "vote-1", userId: "user-789", billId: "bill-123" }, // different user
			]);

			const result = await store.hasUserVotedOnBill("user-456", "bill-123");

			expect(result).toBe(false);
		});
	});

	describe("getVoteCounts", () => {
		it("should count votes by type for a bill", async () => {
			mockDb.votes.getByBillId.mockResolvedValue([
				{ vote: "aye" },
				{ vote: "aye" },
				{ vote: "nay" },
				{ vote: "abstain" },
			]);

			const result = await store.getVoteCounts("bill-123");

			expect(result).toEqual({
				aye: 2,
				nay: 1,
				abstain: 1,
				total: 4,
			});
		});

		it("should handle empty vote list", async () => {
			mockDb.votes.getByBillId.mockResolvedValue([]);

			const result = await store.getVoteCounts("bill-123");

			expect(result).toEqual({
				aye: 0,
				nay: 0,
				abstain: 0,
				total: 0,
			});
		});
	});

	describe("validateVoteData", () => {
		it("should validate complete vote data", () => {
			const validData = {
				billId: "bill-123",
				userId: "user-456",
				vote: "aye",
			};

			expect(() => store.validateVoteData(validData)).not.toThrow();
		});

		it("should reject invalid vote type", () => {
			const invalidData = {
				billId: "bill-123",
				userId: "user-456",
				vote: "invalid",
			};

			expect(() => store.validateVoteData(invalidData)).toThrow(
				"Invalid vote type",
			);
		});

		it("should reject missing bill ID", () => {
			const invalidData = {
				userId: "user-456",
				vote: "yes",
				// missing billId
			};

			expect(() => store.validateVoteData(invalidData)).toThrow(
				"Missing required fields",
			);
		});

		it("should reject missing user ID", () => {
			const invalidData = {
				billId: "bill-123",
				vote: "yes",
				// missing userId
			};

			expect(() => store.validateVoteData(invalidData)).toThrow(
				"Missing required fields",
			);
		});
	});
});
