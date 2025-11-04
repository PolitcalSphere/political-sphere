const express = require("express");
const fs = require("fs");
const { CreateUserSchema } = require("@political-sphere/shared");
const { getDatabase } = require("../index");

const router = express.Router();

router.post("/users", async (req, res) => {
	try {
		const input = CreateUserSchema.parse(req.body);
		const db = getDatabase();
		const user = await db.users.create(input);
		res.status(201).json(user);
	} catch (error) {
		console.error("[users.route] error creating user:", error);
		if (error instanceof Error) {
			if (process.env.NODE_ENV === "test") {
				try {
					fs.writeFileSync(
						"/tmp/political_sphere_last_users_error.json",
						JSON.stringify(
							{
								error: error.message,
								name: error.name,
								stack: error.stack,
								raw: String(error),
							},
							null,
							2,
						),
					);
				} catch (_err) {
					// ignore write failures
				}
				return res.status(400).json({
					error: error.message,
					name: error.name,
					stack: error.stack,
					raw: String(error),
				});
			}
			return res.status(400).json({ error: error.message });
		}

		if (process.env.NODE_ENV === "test") {
			return res
				.status(500)
				.json({ error: "Internal server error", raw: String(error) });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/users/:id", async (req, res) => {
	try {
		const db = getDatabase();
		const user = await db.users.getById(req.params.id);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		res.set("Cache-Control", "public, max-age=600");
		res.json(user);
	} catch (error) {
		console.error("Failed to fetch user", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
