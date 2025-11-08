const express = require("express");
const crypto = require("crypto");

const router = express.Router();

// Mock authentication routes for testing
router.post("/login", (req, res) => {
	const { email, password } = req.body;

	// Mock authentication - in real app this would validate against database
	if (email && password) {
		const token = crypto.randomBytes(32).toString("hex");
		res.json({
			success: true,
			token,
			user: { id: "1", email },
		});
	} else {
		res.status(400).json({
			success: false,
			error: "Email and password required",
		});
	}
});

router.post("/register", (req, res) => {
	const { email, password, name } = req.body;

	// Mock registration
	if (email && password && name) {
		const user = {
			id: Date.now().toString(),
			email,
			name,
			createdAt: new Date().toISOString(),
		};

		res.status(201).json({
			success: true,
			user,
		});
	} else {
		res.status(400).json({
			success: false,
			error: "Email, password, and name required",
		});
	}
});

router.post("/logout", (req, res) => {
	// Mock logout
	res.json({
		success: true,
		message: "Logged out successfully",
	});
});

module.exports = router;
