import express from "express";
// Use local CJS shim for shared schemas in test/runtime
import { CreateBillSchema } from "../shared-shim.js";
import { getDatabase } from "../index.js";

const router = express.Router();

router.post("/bills", async (req, res) => {
	try {
		console.log("[DEBUG] POST /bills request body:", JSON.stringify(req.body));
		const input = CreateBillSchema.parse(req.body);
		console.log("[DEBUG] Parsed input:", JSON.stringify(input));
		const db = getDatabase();
		const bill = await db.bills.create(input);
		res.status(201).json(bill);
	} catch (error) {
		console.error("[ERROR] POST /bills failed:", error);
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
		console.error("Failed to fetch bill", error);
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
		console.error("Failed to list bills", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
