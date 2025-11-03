import { CreateUserSchema } from "@political-sphere/shared";
import express from "express";
import { UserService } from "../domain";

const router = express.Router();
const userService = new UserService();

router.post("/users", async (req, res) => {
	try {
		// Debugging: log content-type and req.body presence to diagnose 415 errors in tests
		// (temporary; will be removed once the underlying issue is fixed)
		// eslint-disable-next-line no-console
		console.debug("[users.route] headers:", req.headers);
		// eslint-disable-next-line no-console
		console.debug(
			"[users.route] is application/json?",
			req.is("application/json"),
		);
		// eslint-disable-next-line no-console
		console.debug("[users.route] body present?", !!req.body);
		const input = CreateUserSchema.parse(req.body);
		const user = await userService.createUser(input);
		res.status(201).json(user);
	} catch (error) {
		if (error instanceof Error) {
			res.status(400).json({ error: error.message });
		} else {
			res.status(500).json({ error: "Internal server error" });
		}
	}
});

router.get("/users/:id", async (req, res) => {
	try {
		const user = await userService.getUserById(req.params.id);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		res.set("Cache-Control", "public, max-age=600"); // Cache for 10 minutes
		res.json(user);
	} catch (error) {
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
