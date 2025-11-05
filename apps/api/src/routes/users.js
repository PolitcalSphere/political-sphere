import crypto from "crypto";
import express from "express";
import { getDatabase } from "../index.js";
import logger from "../logger.js";
import { validate } from "../middleware/validation.js";
// Use local CJS shim for shared schemas in test/runtime
import { CreateUserSchema } from "../shared-shim.js";

const router = express.Router();

router.post("/users", validate(CreateUserSchema), async (req, res) => {
	try {
		const db = getDatabase();
		const user = await db.users.create(req.body);
		logger.info("User created", { userId: user.id, email: user.email });
		res.status(201).json({ success: true, data: user });
	} catch (error) {
		logger.error("Failed to create user", {
			error: error.message,
			email: req.body.email,
		});
		if (/UNIQUE constraint failed/i.test(error.message || "")) {
			return res.status(400).json({
				success: false,
				error: "User already exists",
			});
		}
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
});

router.get("/users/:id", async (req, res) => {
	try {
		const db = getDatabase();
		const user = await db.users.getById(req.params.id);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		res.set("Cache-Control", "public, max-age=600");
		res.json(user);
	} catch (error) {
		logger.error("Failed to fetch user", {
			error: error.message,
			userId: req.params.id,
		});
		res.status(500).json({ error: "Internal server error" });
	}
});

// GDPR Data Export Endpoint
router.get("/users/:id/export", async (req, res) => {
	try {
		const db = getDatabase();
		const user = await db.users.getById(req.params.id);
		if (!user) {
			return res.status(404).json({
				success: false,
				error: "User not found",
				message: "No user data available for export",
			});
		}

		// Export user data in GDPR-compliant format
		const exportData = {
			user: {
				id: user.id,
				email: user.email,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
				// Include other user data as needed
			},
			exportedAt: new Date().toISOString(),
			purpose: "GDPR Article 15 - Right of Access",
			format: "JSON",
		};

		logger.audit("User data exported for GDPR compliance", {
			userId: req.params.id,
			exportedBy: req.user?.id || "anonymous",
		});

		res.set("Content-Type", "application/json");
		res.set(
			"Content-Disposition",
			`attachment; filename="user-${req.params.id}-export.json"`,
		);
		res.json(exportData);
	} catch (error) {
		logger.error("Failed to export user data", {
			error: error.message,
			userId: req.params.id,
		});
		res.status(500).json({
			success: false,
			error: "Export failed",
			message: "Unable to export user data at this time",
		});
	}
});

// GDPR Data Deletion Endpoint
router.delete("/users/:id/gdpr", async (req, res) => {
	try {
		const db = getDatabase();
		const user = await db.users.getById(req.params.id);
		if (!user) {
			return res.status(404).json({
				success: false,
				error: "User not found",
				message: "No user data available for deletion",
			});
		}

		// Mark user for deletion (soft delete for audit trail)
		await db.users.update(req.params.id, {
			deletedAt: new Date().toISOString(),
			deletionReason: "GDPR Article 17 - Right to Erasure",
			deletedBy: req.user?.id || "system",
		});

		// Log compliance event
		const complianceService = await import("../complianceService.js");
		complianceService.default.logComplianceEvent({
			category: "data_deletion",
			action: "gdpr_erasure",
			userId: req.params.id,
			resource: "user",
			details: {
				lawfulBasis: "GDPR Article 17",
				deletedBy: req.user?.id || "system",
			},
		});

		logger.audit("User data deleted for GDPR compliance", {
			userId: req.params.id,
			deletedBy: req.user?.id || "system",
		});

		res.json({
			success: true,
			message:
				"User data deletion initiated. Data will be permanently removed within 30 days.",
			deletionId: crypto.randomUUID(),
		});
	} catch (error) {
		logger.error("Failed to delete user data", {
			error: error.message,
			userId: req.params.id,
		});
		res.status(500).json({
			success: false,
			error: "Deletion failed",
			message: "Unable to delete user data at this time",
		});
	}
});

export default router;
