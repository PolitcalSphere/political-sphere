import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import authRoutes from "../routes/auth.js";

// Set required environment variables for tests
process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-key";

// Create a shared mock DB instance
const mockDb = {
	users: {
		create: vi.fn(),
		getById: vi.fn(),
		getByUsername: vi.fn(),
	},
};

// Mock the database and auth dependencies
vi.mock("../index.js", () => ({
	getDatabase: vi.fn(() => mockDb),
}));

vi.mock("../logger.js", () => ({
	default: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		audit: vi.fn(),
	},
}));

vi.mock("bcrypt", () => ({
	default: {
		hash: vi.fn(async (password) => `hashed:${password}`),
		compare: vi.fn(async (password, hash) => {
			if (hash === "hashed-password" && password === "password123") {
				return true;
			}
			return hash === `hashed:${password}`;
		}),
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
				passwordHash: expect.any(String),
				role: "VIEWER",
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
			const { getDatabase } = await import("../modules/stores/index.js");
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
			mockDb.users.getByUsername.mockResolvedValue({
				id: "user-123",
				username: "testuser",
				email: "test@example.com",
				passwordHash: "hashed-password",
			});

			const response = await request(app)
				.post("/auth/login")
				.send({
					email: "test@example.com",
					password: "password123",
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty("token");
			expect(response.body.data).toHaveProperty("user");
		});

		it("should return 401 for invalid credentials", async () => {
			mockDb.users.getByUsername.mockResolvedValue(null);

			const response = await request(app)
				.post("/auth/login")
				.send({
					email: "nonexistent@example.com",
					password: "wrongpassword",
				})
				.expect(401);

			expect(response.body.success).toBe(false);
			expect(response.body.error).toBe("Invalid credentials");
		});
	});
});
