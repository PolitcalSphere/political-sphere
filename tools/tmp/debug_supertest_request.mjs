import express from "express";
import request from "supertest";
import usersRouter from "../../apps/api/src/routes/users.js";
import { closeDatabase, getDatabase } from "../../apps/api/src/stores/index.js";

// Security: Simple sanitizer for debug logging
const sanitizeForLog = (obj) => {
	if (!obj || typeof obj !== "object") return obj;
	const sanitized = {};
	for (const [key, value] of Object.entries(obj)) {
		if (typeof value === "string") {
			sanitized[key] = value.replace(/[\n\r\t]/g, " ").substring(0, 500);
		} else {
			sanitized[key] = value;
		}
	}
	return sanitized;
};

const app = express();
app.use((req, _res, next) => {
	console.log("[debug-script] incoming headers:", sanitizeForLog(req.headers));
	next();
});
app.use(express.json({ type: "*/*" }));
app.use("/api", usersRouter);

(async () => {
	getDatabase();
	try {
		const res = await request(app)
			.post("/api/users")
			.send({ username: "testuser", email: "test@example.com" });

		console.log("[debug-script] status:", res.status);
		console.log("[debug-script] headers:", res.headers);
		console.log("[debug-script] body:", res.body);
		console.log("[debug-script] text:", res.text);
	} catch (err) {
		console.error("[debug-script] error", err);
	} finally {
		closeDatabase();
	}
})();
