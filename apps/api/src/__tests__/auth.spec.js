import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import authRoutes from "../routes/auth.js";

// Mock the database and auth dependencies
vi.mock("../index.js", () => ({
	getDatabase: vi.fn(() => ({
		users: {
			create: vi.fn(),
			getById: vi.fn(),
			getByUsername: vi.fn(),
		},
	})),
}));

vi.mock("../logger.js", () => ({
	default: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("Auth Routes", () => {
	let app;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use("/auth", authRoutes);
		vi.clearAllMocks();
	});

	describe("POST /auth/register", () => {
		it("should register a new user successfully", async () => {
			const { getDatabase } = await import("../index.js");
			const mockDb = getDatabase();
			mockDb.users.create.mockResolvedValue({
				id: "user-123",
				username: "testuser",
				email: "test@example.com",
			});

			const response = await request(app)
				.post("/auth/register")
				.send({
					username: "testuser",
					email: "test@example.com",
					password: "password123",
				})
				.expect(201);

			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty("id", "user-123");
			expect(mockDb.users.create).toHaveBeenCalledWith({
				username: "testuser",
				email: "test@example.com",
				password: "password123",
			});
		});

		it("should return 400 for invalid input", async () => {
			const response = await request(app)
				.post("/auth/register")
				.send({
					username: "",
					email: "invalid-email",
				})
				.expect(400);

			expect(response.body.success).toBe(false);
			expect(response.body.error).toBeDefined();
		});

		it("should return 409 for duplicate username", async () => {
			const { getDatabase } = await import("../index.js");
			const mockDb = getDatabase();
			mockDb.users.create.mockRejectedValue(
				new Error("UNIQUE constraint failed: users.username"),
			);

			const response = await request(app)
				.post("/auth/register")
				.send({
					username: "existinguser",
					email: "test@example.com",
					password: "password123",
				})
				.expect(409);

			expect(response.body.success).toBe(false);
			expect(response.body.error).toBe("User already exists");
		});
	});

	describe("POST /auth/login", () => {
		it("should login user successfully", async () => {
			const { getDatabase } = await import("../index.js");
			const mockDb = getDatabase();
			mockDb.users.getByUsername.mockResolvedValue({
				id: "user-123",
				username: "testuser",
				email: "test@example.com",
				passwordHash: "hashed-password",
			});

			const response = await request(app)
				.post("/auth/login")
				.send({
					username: "testuser",
					password: "password123",
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty("token");
			expect(response.body.data).toHaveProperty("user");
		});

		it("should return 401 for invalid credentials", async () => {
			const { getDatabase } = await import("../index.js");
			const mockDb = getDatabase();
			mockDb.users.getByUsername.mockResolvedValue(null);

			const response = await request(app)
				.post("/auth/login")
				.send({
					username: "nonexistent",
					password: "wrongpassword",
				})
				.expect(401);

			expect(response.body.success).toBe(false);
			expect(response.body.error).toBe("Invalid credentials");
		});
	});
});
