import { beforeEach, describe, expect, it, vi } from "vitest";
import UserStore from "../stores/user-store.js";

// Mock the database
vi.mock("../index.js", () => ({
	getDatabase: vi.fn(() => ({
		users: {
			create: vi.fn(),
			getById: vi.fn(),
			getByUsername: vi.fn(),
			getByEmail: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			getAll: vi.fn(),
		},
	})),
}));

describe("UserStore", () => {
	let store;
	let mockDb;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { getDatabase } = await import("../modules/stores/index.js");
		mockDb = getDatabase();
		store = new UserStore(mockDb.users);
	});

	describe("create", () => {
		it("should create a new user", async () => {
			const userData = {
				username: "testuser",
				email: "test@example.com",
				passwordHash: "hashed-password",
			};

			mockDb.users.create.mockResolvedValue({
				id: "user-123",
				...userData,
				createdAt: "2025-11-05T00:00:00Z",
			});

			const result = await store.create(userData);

			expect(result).toHaveProperty("id", "user-123");
			expect(result).toHaveProperty("username", "testuser");
			expect(result).toHaveProperty("email", "test@example.com");
			expect(mockDb.users.create).toHaveBeenCalledWith(userData);
		});

		it("should handle database errors", async () => {
			mockDb.users.create.mockRejectedValue(new Error("Database error"));

			await expect(store.create({})).rejects.toThrow("Database error");
		});
	});

	describe("getById", () => {
		it("should retrieve user by ID", async () => {
			const mockUser = {
				id: "user-123",
				username: "testuser",
				email: "test@example.com",
			};

			mockDb.users.getById.mockResolvedValue(mockUser);

			const result = await store.getById("user-123");

			expect(result).toEqual(mockUser);
			expect(mockDb.users.getById).toHaveBeenCalledWith("user-123");
		});

		it("should return null for non-existent user", async () => {
			mockDb.users.getById.mockResolvedValue(null);

			const result = await store.getById("non-existent");

			expect(result).toBeNull();
		});
	});

	describe("getByUsername", () => {
		it("should retrieve user by username", async () => {
			const mockUser = {
				id: "user-123",
				username: "testuser",
				email: "test@example.com",
			};

			mockDb.users.getByUsername.mockResolvedValue(mockUser);

			const result = await store.getByUsername("testuser");

			expect(result).toEqual(mockUser);
			expect(mockDb.users.getByUsername).toHaveBeenCalledWith("testuser");
		});
	});

	describe("getByEmail", () => {
		it("should retrieve user by email", async () => {
			const mockUser = {
				id: "user-123",
				username: "testuser",
				email: "test@example.com",
			};

			mockDb.users.getByEmail.mockResolvedValue(mockUser);

			const result = await store.getByEmail("test@example.com");

			expect(result).toEqual(mockUser);
			expect(mockDb.users.getByEmail).toHaveBeenCalledWith("test@example.com");
		});
	});

	describe("update", () => {
		it("should update user data", async () => {
			const updateData = {
				email: "newemail@example.com",
				profile: { displayName: "New Name" },
			};

			mockDb.users.update.mockResolvedValue({
				id: "user-123",
				username: "testuser",
				email: "newemail@example.com",
				profile: { displayName: "New Name" },
			});

			const result = await store.update("user-123", updateData);

			expect(result).toHaveProperty("email", "newemail@example.com");
			expect(mockDb.users.update).toHaveBeenCalledWith("user-123", updateData);
		});
	});

	describe("delete", () => {
		it("should delete user", async () => {
			mockDb.users.delete.mockResolvedValue(true);

			const result = await store.delete("user-123");

			expect(result).toBe(true);
			expect(mockDb.users.delete).toHaveBeenCalledWith("user-123");
		});
	});

	describe("getAll", () => {
		it("should retrieve all users", async () => {
			const mockUsers = [
				{ id: "user-1", username: "user1" },
				{ id: "user-2", username: "user2" },
			];

			mockDb.users.getAll.mockResolvedValue(mockUsers);

			const result = await store.getAll();

			expect(result).toEqual(mockUsers);
			expect(mockDb.users.getAll).toHaveBeenCalled();
		});

		it("should support filtering", async () => {
			const mockUsers = [{ id: "user-1", username: "user1" }];
			const filters = { active: true };

			mockDb.users.getAll.mockResolvedValue(mockUsers);

			const result = await store.getAll(filters);

			expect(result).toEqual(mockUsers);
			expect(mockDb.users.getAll).toHaveBeenCalledWith(filters);
		});
	});

	describe("validateUserData", () => {
		it("should validate complete user data", () => {
			const validData = {
				username: "testuser",
				email: "test@example.com",
				passwordHash: "hashed-password",
			};

			expect(() => store.validateUserData(validData)).not.toThrow();
		});

		it("should reject invalid username", () => {
			const invalidData = {
				username: "us", // too short
				email: "test@example.com",
			};

			expect(() => store.validateUserData(invalidData)).toThrow(
				"Invalid username",
			);
		});

		it("should reject invalid email", () => {
			const invalidData = {
				username: "testuser",
				email: "invalid-email",
			};

			expect(() => store.validateUserData(invalidData)).toThrow(
				"Invalid email",
			);
		});
	});
});
