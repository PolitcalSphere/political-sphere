import express from "express";
// Use local CJS shim for shared schemas in test/runtime
import { CreateVoteSchema } from "../shared-shim.js";
import { getDatabase } from "../index.js";

const router = express.Router();

router.post("/votes", async (req, res) => {
	try {
		const input = CreateVoteSchema.parse(req.body);
		const db = getDatabase();
		const vote = await db.votes.create(input);
		res.status(201).json(vote);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Invalid request";
		res.status(400).json({ error: message });
	}
});

router.get("/bills/:id/votes", async (req, res) => {
	try {
		const db = getDatabase();
		const votes = await db.votes.getByBillId(req.params.id);
		res.set("Cache-Control", "public, max-age=120");
		res.json(votes);
	} catch (error) {
		console.error("Failed to fetch bill votes", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/bills/:id/vote-counts", async (req, res) => {
	try {
		const db = getDatabase();
		const counts = await db.votes.getVoteCounts(req.params.id);
		res.set("Cache-Control", "public, max-age=120");
		res.json(counts);
	} catch (error) {
		console.error("Failed to fetch vote counts", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
