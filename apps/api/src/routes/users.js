const express = require("express");
const { CreateUserSchema } = require("@political-sphere/shared");
const { getDatabase } = require("../index");
const { validate } = require("../middleware/validation");
const logger = require("../logger");

const router = express.Router();

router.post("/users", validate(CreateUserSchema), async (req, res) => {
	try {
		const db = getDatabase();
		const user = await db.users.create(req.body);
		logger.info("User created", { userId: user.id, email: user.email });
		res.status(201).json({
			success: true,
			data: user,
			message: "User created successfully",
		});
	} catch (error) {
		logger.error("Failed to create user", {
			error: error.message,
			email: req.body.email,
		});
		if (error.message.includes("UNIQUE constraint failed")) {
			return res.status(409).json({
				success: false,
				error: "User already exists",
				message: "A user with this email already exists",
			});
		}
		res.status(500).json({
			success: false,
			error: "Internal server error",
			message: "Unable to create user at this time",
		});
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
		logger.error("Failed to fetch user", {
			error: error.message,
			userId: req.params.id,
		});
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
