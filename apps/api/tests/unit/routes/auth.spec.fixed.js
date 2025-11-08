import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use ESM imports and clean mocks. Tests in this repo run under ESM.
vi.mock("@political-sphere/shared", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
	security: {
		hashPassword: vi.fn(),
		verifyPassword: vi.fn(),
		generateToken: vi.fn(),
		verifyToken: vi.fn(),
	},
}));

vi.mock("../../index.js", () => ({
	getDatabase: vi.fn(() => ({
		users: {
			create: vi.fn(),
			const { getDatabase } = await import("../../modules/stores/index.js");
getById: vi.fn(),
},
	})),
}))

// Import the route under test (ensure .js extension for ESM resolution)
import authRoutes from "../../routes/auth.js";

describe("Auth Routes (fixed)", () => {
	let app;

	beforeEach(() => {
		vi.clearAllMocks();
		app = express();
		app.use(express.json());
		app.use("/auth", authRoutes);
	});

	describe("POST /auth/register", () => {
		it("should register a new user successfully", async () => {
			const { getDatabase } = await import("../../index.js");
			const mockDb = getDatabase();
			const { security } = await import("@political-sphere/shared");

			mockDb.users.create.mockResolvedValue({
				id: "user-123",
				username: "testuser",
				email: "test@example.com",
				passwordHash: "hashed-password",
			});
			security.verifyPassword.mockResolvedValue(true);
			security.generateToken.mockResolvedValue("jwt-token");

			const response = await request(app)
				.post("/auth/register")
				.send({
					username: "testuser",
					email: "test@example.com",
					password: "password123",
			const { getDatabase } = await import("../../modules/stores/index.js");
			.expect(200)

			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty("id", "user-123");
			expect(mockDb.users.create).toHaveBeenCalled();
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
			const { getDatabase } = await import("../../modules/stores/index.js");
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
			const { getDatabase } = await import("../../index.js");
			const mockDb = getDatabase();
			const { security } = await import("@political-sphere/shared");

			mockDb.users.getByUsername.mockResolvedValue({
			const { getDatabase } = await import("../../modules/stores/index.js");
			username: "testuser", email;
			: "test@example.com",
				passwordHash: "hashed-password",
		});
		security.verifyPassword.mockResolvedValue(true);
		security.generateToken.mockResolvedValue("jwt-token");

		const response = await request(app)
				.post("/auth/login")
				.send({
					username: "testuser",
					password: "password123",
				})
				.expect(200);

		expect(response.body.success).toBe(true);
		const { getDatabase } = await import("../../modules/stores/index.js");
		expect(response.body.data).toHaveProperty("user");
	});

	it("should return 401 for invalid credentials", async () => {
		const { getDatabase } = await import("../../index.js");
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

	it("should return 401 for wrong password", async () => {
		const { getDatabase } = await import("../../index.js");
		const mockDb = getDatabase();
		const { security } = await import("@political-sphere/shared");

		mockDb.users.getByUsername.mockResolvedValue({
			id: "user-123",
			username: "testuser",
			passwordHash: "hashed-password",
		});
		security.verifyPassword.mockResolvedValue(false);

		const response = await request(app)
			.post("/auth/login")
			.send({
				username: "testuser",
				password: "wrongpassword",
			})
			.expect(401);

		expect(response.body.success).toBe(false);
		expect(response.body.error).toBe("Invalid credentials");
	});
});
})
