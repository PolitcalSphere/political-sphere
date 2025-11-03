import { CreateVoteSchema } from "@political-sphere/shared";
import express from "express";
import { VoteService } from "../domain";

const router = express.Router();
const voteService = new VoteService();

router.post("/votes", async (req, res) => {
	try {
		// Debug: log incoming content-type and body to diagnose 415 failures in tests
		// (temporary - can be removed after diagnosing)
		// eslint-disable-next-line no-console
		console.debug("[votes] headers:", req.headers);
		// eslint-disable-next-line no-console
		console.debug("[votes] is json:", req.is("application/json"));
		// eslint-disable-next-line no-console
		console.debug("[votes] body present:", typeof req.body !== "undefined");
		const input = CreateVoteSchema.parse(req.body);
		const vote = await voteService.castVote(input);
		res.status(201).json(vote);
	} catch (error) {
		if (error instanceof Error) {
			res.status(400).json({ error: error.message });
		} else {
			res.status(500).json({ error: "Internal server error" });
		}
	}
});

router.get("/bills/:id/votes", async (req, res) => {
	try {
		const votes = await voteService.getBillVotes(req.params.id);
		res.set("Cache-Control", "public, max-age=120"); // Cache for 2 minutes
		res.json(votes);
	} catch (error) {
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/bills/:id/vote-counts", async (req, res) => {
	try {
		const counts = await voteService.getVoteCounts(req.params.id);
		res.set("Cache-Control", "public, max-age=120"); // Cache for 2 minutes
		res.json(counts);
	} catch (error) {
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
