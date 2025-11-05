const compression = require("compression");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { getDatabase } = require("./index");
const { authenticate, requireRole } = require("./middleware/auth");
const requestId = require("./middleware/request-id");
const ageVerificationRoutes = require("./routes/ageVerification");
const authRoutes = require("./routes/auth");
const billRoutes = require("./routes/bills");
const complianceRoutes = require("./routes/compliance");
const moderationRoutes = require("./routes/moderation");
const partyRoutes = require("./routes/parties");
const userRoutes = require("./routes/users");
const voteRoutes = require("./routes/votes");
const newsRoutes = require("./routes/news");
const { log } = require("../../../libs/shared/src/log.js");

const app = express();

app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				scriptSrc: ["'self'"],
				imgSrc: ["'self'", "data:", "https:"],
			},
		},
	}),
);

app.use(
	cors({
		origin: process.env.CORS_ORIGIN || "http://localhost:3000",
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
	}),
);

app.use(requestId);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	message: {
		success: false,
		error: "Too many requests",
		message: "Too many requests from this IP, please try again later.",
	},
	standardHeaders: true,
	legacyHeaders: false,
	skipSuccessfulRequests: false,
	skipFailedRequests: false,
});
app.use(limiter);

app.use((req, res, next) => {
	const start = Date.now();
	logger.log("Request received", {
		requestId: req.requestId,
		method: req.method,
		url: req.url,
		ip: req.ip,
		userAgent: req.get("User-Agent"),
	});

	res.on("finish", () => {
		const duration = Date.now() - start;
		logger.log("Request completed", {
			requestId: req.requestId,
			method: req.method,
			url: req.url,
			status: res.statusCode,
			duration,
		});
	});

	next();
});

app.get("/health", (req, res) => {
	res.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
		service: "api",
		requestId: req.requestId,
	});
});

app.get("/ready", (req, res) => {
	// Check database connectivity
	try {
		const db = getDatabase();
		if (db && db.open) {
			res.json({
				status: "ready",
				timestamp: new Date().toISOString(),
				service: "api",
				database: "connected",
				requestId: req.requestId,
			});
		} else {
			res.status(503).json({
				status: "not ready",
				timestamp: new Date().toISOString(),
				service: "api",
				database: "disconnected",
				requestId: req.requestId,
			});
		}
	} catch (error) {
		res.status(503).json({
			status: "not ready",
			timestamp: new Date().toISOString(),
			service: "api",
			database: "error",
			error: process.env.NODE_ENV === "development" ? error.message : "Database check failed",
			requestId: req.requestId,
		});
	}
});

app.use("/api/auth", authRoutes);
app.use("/api/users", authenticate, userRoutes);
app.use("/api/parties", authenticate, partyRoutes);
app.use("/api/bills", authenticate, billRoutes);
app.use("/api/votes", authenticate, voteRoutes);
app.use("/api/moderation", moderationRoutes);
app.use(
	"/api/compliance",
	authenticate,
	requireRole("admin"),
	complianceRoutes,
);
app.use("/api/age-verification", authenticate, ageVerificationRoutes);
app.use("/api", newsRoutes);
app.use("/", newsRoutes);

app.use((err, req, res, _next) => {
	log("error", "Unhandled error", {
		requestId: req.requestId,
		error: err.message,
		stack: err.stack,
		url: req.url,
		method: req.method,
	});

	res.status(500).json({
		success: false,
		error: "Internal server error",
		message:
			process.env.NODE_ENV === "development"
				? err.message
				: "Something went wrong",
	});
});

app.use((req, res) => {
	log("warn", "Route not found", {
		requestId: req.requestId,
		method: req.method,
		url: req.url,
	});

	res.status(404).json({
		success: false,
		error: "Not found",
		message: "The requested resource was not found",
	});
});

const gracefulShutdown = () => {
	log("info", "Received shutdown signal, closing server");

	const db = getDatabase();
	if (db) {
		db.close();
	}

	process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
	log("info", "API server started", {
		host: HOST,
		port: PORT,
		environment: process.env.NODE_ENV || "development",
	});
});

module.exports = app;
