import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import usersRouter from "../routes/users.js";
import { closeDatabase, getDatabase } from "../index.js";

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
});
