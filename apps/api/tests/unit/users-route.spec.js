import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "../index.js";
import usersRouter from "../routes/users.js";

describe("users routes", () => {
	let app;

	beforeEach(() => {
		// Initialize fresh database connection for this test
		getDatabase();
		app = express();
		app.use(express.json());
		app.use("/", usersRouter);
	});

	afterEach(() => {
		// Close database connection to reset for next test
		closeDatabase();
	});

	it("creates a user (POST /users)", async () => {
		const uniqueEmail = `user-${Date.now()}@example.com`;
		const res = await request(app)
			.post("/users")
			.send({ username: `user${Date.now()}`, email: uniqueEmail })
			.set("Content-Type", "application/json");
		expect(res.status).toBe(201);
		expect(res.body.success).toBe(true);
		expect(res.body.data).toHaveProperty("id");
		expect(res.body.data.email).toBe(uniqueEmail);
	});

	it("returns 404 for missing user (GET /users/:id)", async () => {
		const res = await request(app).get("/users/nonexistent-id-12345");
		expect(res.status).toBe(404);
	});

	it("returns user when exists (GET /users/:id)", async () => {
		// First create a user
		const uniqueEmail = `lookup-${Date.now()}@example.com`;
		const createRes = await request(app)
			.post("/users")
			.send({ username: `lookup${Date.now()}`, email: uniqueEmail })
			.set("Content-Type", "application/json");

		expect(createRes.status).toBe(201);
		const userId = createRes.body.data.id;

		// Then retrieve it
		const res = await request(app).get(`/users/${userId}`);
		expect(res.status).toBe(200);
		expect(res.body.id).toBe(userId);
		expect(res.body.email).toBe(uniqueEmail);
	});

	it("exports user data for GDPR compliance (GET /users/:id/export)", async () => {
		// First create a user
		const uniqueEmail = `gdpr-export-${Date.now()}@example.com`;
		const createRes = await request(app)
			.post("/users")
			.send({ username: `gdpr${Date.now()}`, email: uniqueEmail })
			.set("Content-Type", "application/json");

		expect(createRes.status).toBe(201);
		const userId = createRes.body.data.id;

		// Export user data
		const res = await request(app).get(`/users/${userId}/export`);
		expect(res.status).toBe(200);
		expect(res.headers["content-type"]).toContain("application/json");
		expect(res.headers["content-disposition"]).toContain("attachment");
		expect(res.headers["content-disposition"]).toContain(
			`user-${userId}-export.json`,
		);

		expect(res.body.user).toBeDefined();
		expect(res.body.user.id).toBe(userId);
		expect(res.body.user.email).toBe(uniqueEmail);
		expect(res.body.exportedAt).toBeDefined();
		expect(res.body.purpose).toBe("GDPR Article 15 - Right of Access");
		expect(res.body.format).toBe("JSON");
	});

	it("returns 404 for GDPR export of non-existent user (GET /users/:id/export)", async () => {
		const res = await request(app).get("/users/nonexistent-id-12345/export");
		expect(res.status).toBe(404);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe("User not found");
		expect(res.body.message).toBe("No user data available for export");
	});

	it("initiates GDPR data deletion (DELETE /users/:id/gdpr)", async () => {
		// First create a user
		const uniqueEmail = `gdpr-delete-${Date.now()}@example.com`;
		const createRes = await request(app)
			.post("/users")
			.send({ username: `delete${Date.now()}`, email: uniqueEmail })
			.set("Content-Type", "application/json");

		expect(createRes.status).toBe(201);
		const userId = createRes.body.data.id;

		// Delete user data
		const res = await request(app).delete(`/users/${userId}/gdpr`);
		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
		expect(res.body.message).toContain("User data deletion initiated");
		expect(res.body.message).toContain(
			"Data will be permanently removed within 30 days",
		);
		expect(res.body.deletionId).toBeDefined();
	});

	it("returns 404 for GDPR deletion of non-existent user (DELETE /users/:id/gdpr)", async () => {
		const res = await request(app).delete("/users/nonexistent-id-12345/gdpr");
		expect(res.status).toBe(404);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe("User not found");
		expect(res.body.message).toBe("No user data available for deletion");
	});
});
