const express = require("express");
const { PartyStore } = require("../stores/party-store");
const { getDatabase } = require("../modules/stores/index");

const router = express.Router();
const db = getDatabase();
const partyStore = new PartyStore(db);

// GET /parties - Get all parties
router.get("/", async (req, res) => {
	try {
		const parties = await partyStore.getAll();
		res.json({ parties });
	} catch (error) {
		console.error("Error fetching parties:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /parties/:id - Get party by ID
router.get("/:id", async (req, res) => {
	try {
		const party = await partyStore.getById(req.params.id);
		if (!party) {
			return res.status(404).json({ error: "Party not found" });
		}
		res.json({ party });
	} catch (error) {
		console.error("Error fetching party:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// POST /parties - Create new party
router.post("/", async (req, res) => {
	try {
		const party = await partyStore.create(req.body);
		res.status(201).json({ party });
	} catch (error) {
		console.error("Error creating party:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// PUT /parties/:id - Update party
router.put("/:id", async (req, res) => {
	try {
		const party = await partyStore.update(req.params.id, req.body);
		if (!party) {
			return res.status(404).json({ error: "Party not found" });
		}
		res.json({ party });
	} catch (error) {
		console.error("Error updating party:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// DELETE /parties/:id - Delete party
router.delete("/:id", async (req, res) => {
	try {
		const deleted = await partyStore.delete(req.params.id);
		if (!deleted) {
			return res.status(404).json({ error: "Party not found" });
		}
		res.json({ success: true });
	} catch (error) {
		console.error("Error deleting party:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
