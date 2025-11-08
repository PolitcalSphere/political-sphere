import { beforeEach, describe, expect, it, vi } from "vitest";
import PartyStore from "../stores/party-store.js";

// Mock the database
vi.mock("../index.js", () => ({
	getDatabase: vi.fn(() => ({
		parties: {
			create: vi.fn(),
			getById: vi.fn(),
			getByName: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			getAll: vi.fn(),
		},
	})),
}));

describe("PartyStore", () => {
	let store;
	let mockDb;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { getDatabase } = await import("../modules/stores/index.js");
		mockDb = getDatabase();
		store = new PartyStore(mockDb.parties);
	});

	describe("create", () => {
		it("should create a new party", async () => {
			const partyData = {
				name: "Test Party",
				description: "A test political party",
				leaderId: "user-123",
			};

			mockDb.parties.create.mockResolvedValue({
				id: "party-123",
				...partyData,
				memberCount: 1,
				createdAt: "2025-11-05T00:00:00Z",
			});

			const result = await store.create(partyData);

			expect(result).toHaveProperty("id", "party-123");
			expect(result).toHaveProperty("name", "Test Party");
			expect(result).toHaveProperty("memberCount", 1);
			expect(mockDb.parties.create).toHaveBeenCalledWith(partyData);
		});

		it("should handle database errors", async () => {
			mockDb.parties.create.mockRejectedValue(new Error("Database error"));

			await expect(store.create({})).rejects.toThrow("Database error");
		});
	});

	describe("getById", () => {
		it("should retrieve party by ID", async () => {
			const mockParty = {
				id: "party-123",
				name: "Test Party",
				description: "A test political party",
				leaderId: "user-123",
				memberCount: 5,
			};

			mockDb.parties.getById.mockResolvedValue(mockParty);

			const result = await store.getById("party-123");

			expect(result).toEqual(mockParty);
			expect(mockDb.parties.getById).toHaveBeenCalledWith("party-123");
		});

		it("should return null for non-existent party", async () => {
			mockDb.parties.getById.mockResolvedValue(null);

			const result = await store.getById("non-existent");

			expect(result).toBeNull();
		});
	});

	describe("getByName", () => {
		it("should retrieve party by name", async () => {
			const mockParty = {
				id: "party-123",
				name: "Test Party",
				description: "A test political party",
				leaderId: "user-123",
				memberCount: 5,
			};

			mockDb.parties.getByName.mockResolvedValue(mockParty);

			const result = await store.getByName("Test Party");

			expect(result).toEqual(mockParty);
			expect(mockDb.parties.getByName).toHaveBeenCalledWith("Test Party");
		});

		it("should return null for non-existent party name", async () => {
			mockDb.parties.getByName.mockResolvedValue(null);

			const result = await store.getByName("Non-existent Party");

			expect(result).toBeNull();
		});
	});

	describe("update", () => {
		it("should update party data", async () => {
			const updateData = {
				description: "Updated description",
				memberCount: 10,
			};

			mockDb.parties.update.mockResolvedValue({
				id: "party-123",
				name: "Test Party",
				description: "Updated description",
				leaderId: "user-123",
				memberCount: 10,
			});

			const result = await store.update("party-123", updateData);

			expect(result).toHaveProperty("description", "Updated description");
			expect(result).toHaveProperty("memberCount", 10);
			expect(mockDb.parties.update).toHaveBeenCalledWith(
				"party-123",
				updateData,
			);
		});
	});

	describe("delete", () => {
		it("should delete party", async () => {
			mockDb.parties.delete.mockResolvedValue(true);

			const result = await store.delete("party-123");

			expect(result).toBe(true);
			expect(mockDb.parties.delete).toHaveBeenCalledWith("party-123");
		});
	});

	describe("getAll", () => {
		it("should retrieve all parties", async () => {
			const mockParties = [
				{ id: "party-1", name: "Party 1", memberCount: 5 },
				{ id: "party-2", name: "Party 2", memberCount: 3 },
			];

			mockDb.parties.getAll.mockResolvedValue(mockParties);

			const result = await store.getAll();

			expect(result).toEqual(mockParties);
			expect(mockDb.parties.getAll).toHaveBeenCalled();
		});
	});
});
