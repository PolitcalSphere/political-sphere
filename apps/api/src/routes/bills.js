import { CreateBillSchema } from "@political-sphere/shared";
import express from "express";
import { BillService } from "../domain";

const router = express.Router();
const billService = new BillService();

router.post("/bills", async (req, res) => {
	try {
		// Debugging: log content-type and req.body presence to diagnose 415 errors in tests
		// eslint-disable-next-line no-console
		console.debug("[bills.route] headers:", req.headers);
		// eslint-disable-next-line no-console
		console.debug(
			"[bills.route] is application/json?",
			req.is("application/json"),
		);
		// eslint-disable-next-line no-console
		console.debug("[bills.route] body present?", !!req.body);
		const input = CreateBillSchema.parse(req.body);
		const bill = await billService.proposeBill(input);
		res.status(201).json(bill);
	} catch (error) {
		if (error instanceof Error) {
			res.status(400).json({ error: error.message });
		} else {
			res.status(500).json({ error: "Internal server error" });
		}
	}
});

router.get("/bills/:id", async (req, res) => {
	try {
		const bill = await billService.getBillById(req.params.id);
		if (!bill) {
			return res.status(404).json({ error: "Bill not found" });
		}
		res.set("Cache-Control", "public, max-age=300"); // Cache for 5 minutes
		res.json(bill);
	} catch (error) {
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/bills", async (req, res) => {
	try {
		const bills = await billService.getAllBills();
		res.set("Cache-Control", "public, max-age=60"); // Cache for 1 minute
		res.json(bills);
	} catch (error) {
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
