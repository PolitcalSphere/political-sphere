import { CreatePartySchema } from "@political-sphere/shared";
import express from "express";
import { PartyService } from "../domain";

const router = express.Router();
const partyService = new PartyService();

router.post("/parties", async (req, res) => {
	try {
		const input = CreatePartySchema.parse(req.body);
		const party = await partyService.createParty(input);
		res.status(201).json(party);
	} catch (error) {
		if (error instanceof Error) {
			res.status(400).json({ error: error.message });
		} else {
			res.status(500).json({ error: "Internal server error" });
		}
	}
});

router.get("/parties/:id", async (req, res) => {
	try {
		const party = await partyService.getPartyById(req.params.id);
		if (!party) {
			return res.status(404).json({ error: "Party not found" });
		}
		res.set("Cache-Control", "public, max-age=600"); // Cache for 10 minutes
		res.json(party);
	} catch (error) {
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/parties", async (req, res) => {
	try {
		const parties = await partyService.getAllParties();
		res.set("Cache-Control", "public, max-age=300"); // Cache for 5 minutes
		res.json(parties);
	} catch (error) {
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
