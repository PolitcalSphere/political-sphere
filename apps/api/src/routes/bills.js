const express = require("express");
// Use local CJS shim for shared schemas in test/runtime
const { CreateBillSchema } = require("../shared-shim.js");
const { getDatabase } = require("../index");
const { log } = require("../../../../libs/shared/src/log.js");

const router = express.Router();

router.post("/bills", async (req, res) => {
	try {
		log("info", "POST /bills request", { body: req.body });
		const input = CreateBillSchema.parse(req.body);
		log("info", "Parsed input", { input });
		const db = getDatabase();
		const bill = await db.bills.create(input);
		res.status(201).json(bill);
	} catch (error) {
		log("error", "POST /bills failed", { error: error instanceof Error ? error.message : String(error) });
		const message = error instanceof Error ? error.message : "Invalid request";
		res.status(400).json({ error: message });
	}
});

router.get("/bills/:id", async (req, res) => {
	try {
		const db = getDatabase();
		const bill = await db.bills.getById(req.params.id);
		if (!bill) {
			return res.status(404).json({ error: "Bill not found" });
		}
		res.set("Cache-Control", "public, max-age=300");
		res.json(bill);
	} catch (error) {
		log("error", "Failed to fetch bill", { error: error instanceof Error ? error.message : String(error), billId: req.params.id });
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/bills", async (req, res) => {
	try {
		const db = getDatabase();
		const page = Number.parseInt(req.query.page, 10) || 1;
		const limit = Math.min(Number.parseInt(req.query.limit, 10) || 10, 100);
		const result = await db.bills.getAll(page, limit);
		res.set("Cache-Control", "public, max-age=60");
		if (result && Array.isArray(result.bills)) {
			return res.json(result.bills);
		}
		res.json(result);
	} catch (error) {
		log("error", "Failed to list bills", { error: error instanceof Error ? error.message : String(error) });
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
