const express = require("express");
const { CreatePartySchema } = require("@political-sphere/shared");
const { getDatabase } = require("../index");

const router = express.Router();

router.post("/parties", async (req, res) => {
	try {
		const input = CreatePartySchema.parse(req.body);
		const db = getDatabase();
		const party = await db.parties.create(input);
		res.status(201).json(party);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Invalid request";
		res.status(400).json({ error: message });
	}
});

router.get("/parties/:id", async (req, res) => {
	try {
		const db = getDatabase();
		const party = await db.parties.getById(req.params.id);
		if (!party) {
			return res.status(404).json({ error: "Party not found" });
		}
		res.set("Cache-Control", "public, max-age=600");
		res.json(party);
	} catch (error) {
		console.error("Failed to fetch party", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/parties", async (_req, res) => {
	try {
		const db = getDatabase();
		const parties = await db.parties.getAll();
		res.set("Cache-Control", "public, max-age=300");
		res.json(parties);
	} catch (error) {
		console.error("Failed to list parties", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
