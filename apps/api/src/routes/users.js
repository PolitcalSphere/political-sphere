const express = require("express");
const logger = require("../logger");
const { UserStore } = require("../stores/user-store");
const { getDatabase } = require("../modules/stores/index");

const router = express.Router();
const db = getDatabase();
const userStore = new UserStore(db);

// GET /users - Get all users
router.get("/", async (req, res) => {
	try {
		const users = await userStore.getAll();
		res.json({ users });
	} catch (error) {
		logger.error("Error fetching users:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /users/:id - Get user by ID
router.get("/:id", async (req, res) => {
	try {
		const user = await userStore.getById(req.params.id);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		res.json({ user });
	} catch (error) {
		logger.error("Error fetching user:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// POST /users - Create new user
router.post("/", async (req, res) => {
	try {
		const user = await userStore.create(req.body);
		res.status(201).json({ user });
	} catch (error) {
		logger.error("Error creating user:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// PUT /users/:id - Update user
router.put("/:id", async (req, res) => {
	try {
		const user = await userStore.update(req.params.id, req.body);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		res.json({ user });
	} catch (error) {
		logger.error("Error updating user:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// DELETE /users/:id - Delete user
router.delete("/:id", async (req, res) => {
	try {
		const deleted = await userStore.delete(req.params.id);
		if (!deleted) {
			return res.status(404).json({ error: "User not found" });
		}
		res.json({ success: true });
	} catch (error) {
		logger.error("Error deleting user:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
