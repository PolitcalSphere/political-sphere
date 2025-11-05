const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { advanceGameState } = require("../../../libs/game-engine/src/engine");
const complianceClient = require("./complianceClient");
const { CircuitBreaker } = require("../api/src/error-handler");

const fs = require("node:fs");
const path = require("node:path");

// DB adapter (SQLite) handles persistence
const dbModule = require("./db");
const dbReady =
	dbModule && typeof dbModule.then === "function"
		? dbModule
		: Promise.resolve(dbModule);

let db = null;
let games = new Map();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Circuit breakers for external service calls
const moderationCircuitBreaker = new CircuitBreaker(5, 60000, 60000); // 5 failures, 1min timeout
const ageVerificationCircuitBreaker = new CircuitBreaker(3, 30000, 30000); // 3 failures, 30s timeout
const ageCheckAccessCircuitBreaker = new CircuitBreaker(3, 30000, 30000);

// Healthcheck
app.get("/healthz", (_, res) => res.json({ status: "ok" }));

// Simple local moderation (scaffold) — regex-based checks for early compliance
function localModeration(text) {
	const reasons = [];
	const lower = (text || "").toLowerCase();

	// simple hate/violence patterns
	if (/\b(hate|kill|murder|terror|bomb|weapon)\b/.test(lower))
		reasons.push("Potential hate/violence");
	// child safety
	if (/\b(child|kid|minor).*(sex|porn|naked)\b/.test(lower))
		reasons.push("Child safety");
	// profanity
	if (/\b(fuck|shit|bitch|asshole)\b/.test(lower)) reasons.push("Profanity");

	return { isSafe: reasons.length === 0, reasons };
}

// (remote moderation implementation provided further below)

// Remote moderation client with retries, auth and compliance logging
const MODERATION_ENDPOINT =
	process.env.API_MODERATION_URL ||
	(process.env.API_BASE_URL
		? `${process.env.API_BASE_URL.replace(/\/$/, "")}/api/moderation/analyze`
		: "http://localhost:4000/api/moderation/analyze");

async function remoteModeration(text, userId = null) {
	if (!MODERATION_ENDPOINT) return null;

	const apiKey = process.env.MODERATION_API_KEY || process.env.API_KEY || null;

	try {
		const result = await moderationCircuitBreaker.execute(async () => {
			const headers = { "content-type": "application/json" };
			if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

			const res = await fetch(MODERATION_ENDPOINT, {
				method: "POST",
				headers,
				body: JSON.stringify({ content: text, userId, type: "text" }),
				signal: AbortSignal.timeout(10000), // 10 second timeout
			});

			if (!res.ok) {
				const body = await res.text().catch(() => "<no-body>");
				throw new Error(`Moderation API responded ${res.status}: ${body}`);
			}

			const data = await res.json().catch(() => null);
			if (!data?.success || typeof data?.data?.isSafe !== "boolean") {
				throw new Error("Invalid moderation API response format");
			}

			return data.data;
		});

		// Record the successful check for auditability (non-blocking)
		complianceClient
			.logEvent({
				category: "content_moderation",
				action: "moderation_checked",
				userId,
				details: {
					endpoint: MODERATION_ENDPOINT,
					isSafe: result.isSafe,
					reasons: result.reasons || [],
					category: result.category || null,
				},
				complianceFrameworks: ["DSA"],
			})
			.catch(() => {});

		return result;
	} catch (error) {
		console.error("Moderation circuit breaker failed:", error.message);

		// Record failure in compliance logs for audit
		await complianceClient
			.logEvent({
				category: "content_moderation",
				action: "moderation_api_failure",
				details: {
					endpoint: MODERATION_ENDPOINT,
					error: error.message,
				},
				complianceFrameworks: ["DSA"],
			})
			.catch(() => {});

		return null; // Circuit breaker will handle retries, return null on failure
	}
}

// Create a new game
app.post("/games", async (req, res) => {
	const { name } = req.body;
	if (!name) return res.status(400).json({ error: "name is required" });

	const id = uuidv4();
	const now = new Date().toISOString();
	const game = {
		id,
		name,
		players: [],
		proposals: [],
		votes: [],
		economy: { treasury: 100000, inflationRate: 0.02, unemploymentRate: 0.05 },
		turn: { turnNumber: 0, phase: "lobby" },
		createdAt: now,
		updatedAt: now,
		contentRating: "PG", // Default content rating
		moderationEnabled: true,
		ageVerificationRequired: true,
	};

	games.set(id, game);
	// persist the new game
	if (db && typeof db.upsertGame === "function") {
		await db.upsertGame(id, game);
	}

	// Log game creation for compliance
	await complianceClient.logGameCreated(
		id,
		req.body?.userId || req.user?.id || "anonymous",
		name,
	);

	return res.status(201).json({ game });
});

// Age verification and access check endpoints
const AGE_STATUS_ENDPOINT = process.env.API_BASE_URL
	? `${process.env.API_BASE_URL.replace(/\/$/, "")}/api/age/status`
	: "http://localhost:4000/api/age/status";
const AGE_CHECK_ACCESS_ENDPOINT = process.env.API_BASE_URL
	? `${process.env.API_BASE_URL.replace(/\/$/, "")}/api/age/check-access`
	: "http://localhost:4000/api/age/check-access";

async function checkAgeVerification(userId) {
	if (!AGE_STATUS_ENDPOINT) return { verified: false, age: null };

	try {
		const result = await ageVerificationCircuitBreaker.execute(async () => {
			const res = await fetch(AGE_STATUS_ENDPOINT, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${userId}`, // Assuming userId is a token
					"content-type": "application/json",
				},
				signal: AbortSignal.timeout(5000), // 5 second timeout
			});

			if (!res.ok) {
				throw new Error(`Age verification API responded ${res.status}`);
			}

			const data = await res.json();
			if (!data.success) {
				throw new Error("Age verification API returned unsuccessful response");
			}

			return data.data;
		});

		return result;
	} catch (error) {
		console.error("Age verification circuit breaker failed:", error.message);
		return { verified: false, age: null };
	}
}

async function checkContentAccess(userId, contentRating) {
	if (!AGE_CHECK_ACCESS_ENDPOINT) return false;

	try {
		const result = await ageCheckAccessCircuitBreaker.execute(async () => {
			const res = await fetch(AGE_CHECK_ACCESS_ENDPOINT, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${userId}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({ contentRating }),
				signal: AbortSignal.timeout(5000), // 5 second timeout
			});

			if (!res.ok) {
				throw new Error(`Age check access API responded ${res.status}`);
			}

			const data = await res.json();
			if (!data.success) {
				throw new Error("Age check access API returned unsuccessful response");
			}

			return data.data.canAccess;
		});

		return result;
	} catch (error) {
		console.error("Age check access circuit breaker failed:", error.message);
		return false;
	}
}

// Join a game
app.post("/games/:id/join", async (req, res) => {
	const { id } = req.params;
	const { displayName, userId } = req.body;
	const game = games.get(id);
	if (!game) return res.status(404).json({ error: "game not found" });
	if (!displayName)
		return res.status(400).json({ error: "displayName is required" });

	// Check age verification if required
	if (game.ageVerificationRequired) {
		if (!userId) {
			return res.status(403).json({
				error: "User ID required",
				message: "You must be authenticated to join this game",
			});
		}

		const ageStatus = await checkAgeVerification(userId);
		if (!ageStatus.verified) {
			return res.status(403).json({
				error: "Age verification required",
				message: "You must verify your age to join this game",
			});
		}

		// Check content access
		const canAccess = await checkContentAccess(
			userId,
			game.contentRating || "PG",
		);
		if (!canAccess) {
			return res.status(403).json({
				error: "Content access denied",
				message: "This game content is not suitable for your age group",
			});
		}
	}

	const player = {
		id: uuidv4(),
		displayName,
		createdAt: new Date().toISOString(),
		verifiedAge: userId ? (await checkAgeVerification(userId)).age : null,
		contentRating: game.contentRating || "PG",
	};

	game.players.push(player);
	game.updatedAt = new Date().toISOString();
	games.set(id, game);
	if (db && typeof db.upsertGame === "function") {
		await db.upsertGame(id, game);
	}

	// Log player join for compliance
	await complianceClient.logPlayerJoined(id, userId || player.id, displayName);

	return res.status(200).json({ player, game });
});

// Get game state
app.get("/games/:id/state", (req, res) => {
	const game = games.get(req.params.id);
	if (!game) return res.status(404).json({ error: "game not found" });
	return res.json({ game });
});

// List flagged proposals for a game (moderator view)
app.get("/games/:id/flags", (req, res) => {
	const game = games.get(req.params.id);
	if (!game) return res.status(404).json({ error: "game not found" });
	const flagged = (game.proposals || []).filter(
		(p) => p.status === "flagged" || p.moderationStatus === "flagged",
	);
	return res.json({ flagged });
});

// Moderator review endpoint for flagged proposals
app.post("/games/:id/flags/:proposalId/review", async (req, res) => {
	const { id: gameId, proposalId } = {
		id: req.params.id,
		proposalId: req.params.proposalId,
	};
	const { moderatorId, action, note } = req.body || {};
	const game = games.get(gameId);
	if (!game) return res.status(404).json({ error: "game not found" });

	const proposal = (game.proposals || []).find((p) => p.id === proposalId);
	if (!proposal) return res.status(404).json({ error: "proposal not found" });
	if (
		proposal.status !== "flagged" &&
		proposal.moderationStatus !== "flagged"
	) {
		return res
			.status(400)
			.json({ error: "proposal is not flagged for review" });
	}

	if (!moderatorId || !action)
		return res
			.status(400)
			.json({ error: "moderatorId and action are required" });

	if (action === "approve") {
		proposal.status = "voting";
		proposal.moderationStatus = "approved";
		proposal.reviewedAt = new Date().toISOString();
		proposal.reviewedBy = moderatorId;
		proposal.reviewNote = note || null;
	} else if (action === "reject") {
		proposal.status = "rejected";
		proposal.moderationStatus = "rejected";
		proposal.reviewedAt = new Date().toISOString();
		proposal.reviewedBy = moderatorId;
		proposal.reviewNote = note || null;
	} else {
		return res
			.status(400)
			.json({ error: 'invalid action - must be "approve" or "reject"' });
	}

	game.updatedAt = new Date().toISOString();
	games.set(gameId, game);
	if (db && typeof db.upsertGame === "function")
		await db.upsertGame(gameId, game);

	// Log moderation action
	await complianceClient.logModerationAction(
		proposalId,
		moderatorId,
		action,
		proposal.flaggedReasons || [],
	);

	return res.json({ proposal });
});

// Submit player action (propose, start_debate, speak, vote, advance_turn) — integrated with deterministic engine
app.post("/games/:id/action", async (req, res) => {
	const gameId = req.params.id;
	const game = games.get(gameId);
	if (!game) return res.status(404).json({ error: "game not found" });

	const { action } = req.body;
	if (!action || !action.type)
		return res.status(400).json({ error: "action.type required" });

	// Handle propose with moderation first
	if (action.type === "propose") {
		const { title, description, proposerId } = action.payload || {};
		if (!title || !proposerId)
			return res
				.status(400)
				.json({ error: "title and proposerId are required" });

		const text = `${title}\n${description || ""}`;
		const remote = await remoteModeration(text, proposerId);
		const moderation = remote ?? localModeration(text);

		if (!moderation.isSafe) {
			// store flagged proposal for moderator review (audit trail)
			const flagged = {
				id: uuidv4(),
				title,
				description: description || "",
				proposerId,
				createdAt: new Date().toISOString(),
				status: "flagged",
				moderationStatus: "flagged",
				flaggedReasons: moderation.reasons,
				contentRating: "18", // Flagged content gets highest rating
			};
			game.proposals.push(flagged);
			game.updatedAt = new Date().toISOString();
			games.set(gameId, game);
			if (db && typeof db.upsertGame === "function")
				await db.upsertGame(gameId, game);

			// Log flagged proposal
			await complianceClient.logProposalCreated(
				gameId,
				flagged.id,
				proposerId,
				title,
				true,
				true,
			);

			return res.status(201).json({
				proposal: flagged,
				flagged: true,
				reasons: moderation.reasons,
			});
		}

		// Safe — apply via engine
		const newState = advanceGameState(game, [action], Date.now());
		games.set(gameId, newState);
		if (db && typeof db.upsertGame === "function")
			await db.upsertGame(gameId, newState);
		const newProposal = newState.proposals[newState.proposals.length - 1];

		// Log successful proposal creation
		await complianceClient.logProposalCreated(
			gameId,
			newProposal.id,
			proposerId,
			title,
			true,
			false,
		);

		return res
			.status(201)
			.json({ proposal: newProposal, flagged: false, game: newState });
	}

	// Handle start_debate
	if (action.type === "start_debate") {
		const { proposalId } = action.payload || {};
		if (!proposalId)
			return res.status(400).json({ error: "proposalId required" });

		const newState = advanceGameState(game, [action], Date.now());
		games.set(gameId, newState);
		if (db && typeof db.upsertGame === "function")
			await db.upsertGame(gameId, newState);
		const debate = newState.debates[newState.debates.length - 1];

		return res.status(200).json({ debate, game: newState });
	}

	// Handle speak with moderation
	if (action.type === "speak") {
		const { debateId, speakerId, content } = action.payload || {};
		if (!debateId || !speakerId || !content)
			return res
				.status(400)
				.json({ error: "debateId, speakerId and content are required" });

		const remote = await remoteModeration(content, speakerId);
		const moderation = remote ?? localModeration(content);

		if (!moderation.isSafe) {
			return res.status(400).json({
				error: "Speech content flagged for moderation",
				reasons: moderation.reasons,
			});
		}

		const newState = advanceGameState(game, [action], Date.now());
		games.set(gameId, newState);
		if (db && typeof db.upsertGame === "function")
			await db.upsertGame(gameId, newState);
		const speech = newState.speeches[newState.speeches.length - 1];

		return res.status(200).json({ speech, game: newState });
	}

	// Votes and other actions are routed through the engine
	if (action.type === "vote") {
		const { proposalId, playerId, choice } = action.payload || {};
		if (!proposalId || !playerId || !choice)
			return res
				.status(400)
				.json({ error: "proposalId, playerId and choice are required" });

		const newState = advanceGameState(game, [action], Date.now());
		games.set(gameId, newState);
		if (db && typeof db.upsertGame === "function")
			await db.upsertGame(gameId, newState);
		const vote = newState.votes[newState.votes.length - 1];

		// Log vote for compliance
		await complianceClient.logVoteCast(gameId, proposalId, playerId, choice);

		return res.status(200).json({ vote, game: newState });
	}

	// Handle advance_turn
	if (action.type === "advance_turn") {
		const newState = advanceGameState(game, [action], Date.now());
		games.set(gameId, newState);
		if (db && typeof db.upsertGame === "function")
			await db.upsertGame(gameId, newState);

		return res.status(200).json({ game: newState });
	}

	return res.status(400).json({ error: `unknown action type: ${action.type}` });
});

const PORT = process.env.PORT || 5100;

// Start server after DB adapter is ready and games loaded
async function start() {
	try {
		db = await dbReady;
		// load games from DB (works for both sync and async adapters)
		const loaded = await db.getAllGames();
		games = loaded || new Map();
		console.log(`Loaded ${games.size} games from DB`);

		// Import legacy JSON store if present
		try {
			const legacy = path.join(__dirname, "..", "data", "games.json");
			if (fs.existsSync(legacy)) {
				const raw = fs.readFileSync(legacy, "utf8");
				const obj = JSON.parse(raw);
				const entries = Object.entries(obj || {});
				for (const [id, value] of entries) {
					// if not already present, upsert into DB
					if (!games.has(id)) {
						await db.upsertGame(id, value);
						games.set(id, value);
					}
				}
				// rename legacy file after import
				try {
					fs.renameSync(legacy, legacy + ".imported");
				} catch (_) {}
				console.log(`Imported ${entries.length} games from legacy JSON store`);
			}
		} catch (impErr) {
			console.warn("Legacy JSON import failed:", impErr?.message ?? impErr);
		}

		app.listen(PORT, () =>
			console.log(`Game server listening on http://localhost:${PORT}`),
		);
	} catch (err) {
		console.error("Failed to start server, DB init error:", err.message || err);
		process.exit(1);
	}
}

start();
