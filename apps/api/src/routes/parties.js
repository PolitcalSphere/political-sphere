const express = require("express");
const { CreatePartySchema } = require("@political-sphere/shared");
const { getDatabase } = require("../index");
const { validate } = require("../middleware/validation");
const logger = require("../logger");

const router = express.Router();

router.post("/parties", validate(CreatePartySchema), async (req, res) => {
	try {
		const db = getDatabase();
		const party = await db.parties.create(req.body);
		logger.info("Party created", { partyId: party.id, name: party.name });
		res.status(201).json({
			success: true,
			data: party,
			message: "Party created successfully",
		});
	} catch (error) {
		if (error.message && error.message.includes("UNIQUE constraint failed")) {
			logger.warn("Party creation failed - duplicate name", {
				name: req.body.name,
			});
			return res.status(409).json({
				success: false,
				error: "Party already exists",
				message: "A party with this name already exists",
			});
		}
		logger.error("Failed to create party", {
			error: error.message,
			name: req.body.name,
		});
		res.status(500).json({
			success: false,
			error: "Internal server error",
			message: "Unable to create party at this time",
		});
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
		logger.error("Failed to fetch party", {
			error: error.message,
			partyId: req.params.id,
		});
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
		logger.error("Failed to list parties", { error: error.message });
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
