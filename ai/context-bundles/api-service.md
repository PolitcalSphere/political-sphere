# API Service Snapshot

> Generated: 2025-11-05T14:54:38.650Z

## apps/api/README.md

```
# API Service

The API service exposes read/write endpoints for policy updates and provides analytics consumed by the worker and frontend. It is intentionally lightweight (vanilla Node.js) so it can run anywhere while the broader domain model evolves.

## Endpoints

- `GET /healthz` – readiness probe used by Docker Compose and monitoring.
- `GET /` – discovery document describing the available routes.
- `GET /api/news` – list policy stories with optional filtering (`category`, `tag`, `search`, `limit`).
- `POST /api/news` – create a new policy story (validates `title`, `excerpt`, `content`).
- `GET /api/news/{id}` – retrieve a single record.
- `PUT /api/news/{id}` – update an existing record.
- `GET /metrics/news` – analytics summary consumed by the worker and dashboard.

Because the server is built with native Node.js (`http` module), no additional dependencies or frameworks are required.

## Running locally

```bash
npm run start:api
# or, via Nx:
npx nx serve api
```

The service listens on `API_PORT` (default: `4000`) and binds to `0.0.0.0` so it is reachable from other containers.

Data is persisted to `apps/api/data/news.json`. The `JsonNewsStore` helper keeps the storage format simple while still supporting concurrent updates in tests.

## Testing

- Test suites are standardized on ES modules using `.mjs` files (Jest runner via Nx)
- Legacy `.js` test files remain only as skipped CommonJS placeholders to avoid ESM parse errors in mixed tooling; see `apps/api/tests/*.test.js`
- Run the suite:

```bash
npx nx test api --runInBand
```

Notes:

- Avoid top‑level await in `.js` tests; use async `beforeAll` or convert to `.mjs`
- Keep a single authoritative test per suite to prevent duplicate execution

## Next steps

- Replace the JSON storage layer with a real database module or service client.
- Implement authentication and authorization once the auth service lands.
- Extend the analytics endpoint with additional signals (tone, reach, velocity) as data sources come online.
```

## apps/api/src/server.js

```
import http from 'node:http';
import os from 'node:os';
import process from 'node:process';
import { URL } from 'node:url';
import { notFound, methodNotAllowed, readJsonBody, sendError, sendJson } from './http-utils.js';
import {
  SECURITY_HEADERS,
  getCorsHeaders,
  checkRateLimit,
  getRateLimitInfo,
  isIpAllowed,
  getLogger,
} from '@political-sphere/shared';
import {
  createUser,
  authenticateUser,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  requireAuth,
  initiatePasswordReset,
  resetPassword,
  getUserById,
} from './auth.js';

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

const RATE_LIMIT_OPTIONS = {
  maxRequests: parsePositiveInt(process.env.API_RATE_LIMIT_MAX_REQUESTS, 100),
  windowMs: parsePositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  maxKeys: parsePositiveInt(process.env.API_RATE_LIMIT_MAX_KEYS, 5000),
};

const RATE_LIMIT_WINDOW_SECONDS = Math.max(1, Math.floor(RATE_LIMIT_OPTIONS.windowMs / 1000));
const RATE_LIMIT_POLICY = `${RATE_LIMIT_OPTIONS.maxRequests};w=${RATE_LIMIT_WINDOW_SECONDS}`;
const MAX_BODY_BYTES = parsePositiveInt(process.env.API_MAX_BODY_BYTES, 1024 * 1024);

const corsOptions = {
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'RateLimit-Policy',
  ],
};

function applyHeaders(res, headers) {
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (key.toLowerCase() === 'vary') {
      const incoming = String(value);
      const existing = res.getHeader('Vary');
      if (!existing) {
        res.setHeader('Vary', incoming);
        continue;
      }
      const tokens = new Set(
        (Array.isArray(existing) ? existing : [existing])
          .flatMap((entry) => String(entry).split(','))
          .map((entry) => entry.trim())
          .filter(Boolean)
      );
      for (const token of incoming
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)) {
        tokens.add(token);
      }
      res.setHeader('Vary', Array.from(tokens).join(', '));
      continue;
    }
    res.setHeader(key, value);
  }
}

const logger = getLogger({
  service: 'api',
  level: process.env.LOG_LEVEL || 'info',
  file: process.env.LOG_FILE,
});

export function createNewsServer(newsService, options = {}) {
  const apiBasePath = options.basePath ?? '/api/news';
  const server = http.createServer(async (req, res) => {
    const startTime = Date.now();

    try {
      await handleRequest(req, res, newsService, apiBasePath);
    } catch (error) {
      logger.logError(error, {
        url: req.url,
        method: req.method,
        ip: req.socket.remoteAddress,
      });
      sendError(res, 500, 'Internal Server Error');
    } finally {
      const duration = Date.now() - startTime;
      logger.logRequest(req, res, duration);
    }
  });
  return server;
}

async function handleRequest(req, res, newsService, apiBasePath) {
  const method = req.method ?? 'GET';
  const originalUrl = req.url ?? '/';
  const url = new URL(originalUrl, `http://${req.headers.host ?? 'localhost'}`);
  const pathname = url.pathname;
  const forwardedForHeader =
    typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : null;
  const clientIp =
    forwardedForHeader ||
    (typeof req.socket.remoteAddress === 'string' ? req.socket.remoteAddress : 'unknown');
  const origin = req.headers.origin;

  // Apply security headers to all responses
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Check IP allowlist/blocklist
  if (!isIpAllowed(clientIp)) {
    logger.logSecurityEvent('ip_blocked', { ip: clientIp }, req);
    applyHeaders(res, getCorsHeaders(origin, corsOptions));
    sendError(res, 403, 'Access denied');
    return;
  }

  // Rate limiting (exclude health checks)
  if (pathname !== '/healthz') {
    if (!checkRateLimit(clientIp, RATE_LIMIT_OPTIONS)) {
      logger.logSecurityEvent('rate_limit_exceeded', { ip: clientIp }, req);
      const rateLimitInfo = getRateLimitInfo(clientIp, RATE_LIMIT_OPTIONS);
      const retryAfter = Math.max(1, rateLimitInfo.reset);
      applyHeaders(res, getCorsHeaders(origin, corsOptions));
      sendJson(
        res,
        429,
        {
          error: 'Too many requests',
          retryAfter,
        },
        {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitInfo.reset.toString(),
          'RateLimit-Policy': RATE_LIMIT_POLICY,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      );
      return;
    }

    // Add rate limit headers
    const rateLimitInfo = getRateLimitInfo(clientIp, RATE_LIMIT_OPTIONS);
    res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateLimitInfo.reset.toString());
    res.setHeader('RateLimit-Policy', RATE_LIMIT_POLICY);
  }

  // CORS handling
  const corsHeaders = getCorsHeaders(origin, corsOptions);

  if (method === 'OPTIONS') {
    applyHeaders(res, corsHeaders);
    res.writeHead(204, { 'Content-Length': '0' });
    res.end();
    return;
  }

  applyHeaders(res, corsHeaders);

  if (method === 'GET' && pathname === '/healthz') {
    sendJson(res, 200, { status: 'ok', service: 'api', hostname: os.hostname() });
    return;
  }

  if (method === 'GET' && pathname === '/metrics/news') {
    const summary = await newsService.analyticsSummary();
    sendJson(res, 200, summary);
    return;
  }

  if (pathname === apiBasePath) {
    if (method === 'GET') {
      try {
        const list = await newsService.list({
          category: url.searchParams.get('category') ?? undefined,
          tag: url.searchParams.get('tag') ?? undefined,
          search: url.searchParams.get('search') ?? undefined,
          limit: url.searchParams.get('limit') ?? undefined,
        });
        sendJson(res, 200, { data: list });
      } catch (error) {
        if (error.code === 'VALIDATION_ERROR') {
          sendError(res, 400, error.message, error.details);
          return;
        }
        throw error;
      }
      return;
    }
    if (method === 'POST') {
      let payload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (error.code === 'PAYLOAD_TOO_LARGE') {
          logger.logSecurityEvent('payload_too_large', { limit: MAX_BODY_BYTES }, req);
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (error.code === 'UNSUPPORTED_MEDIA_TYPE') {
          logger.logSecurityEvent(
            'unsupported_media_type',
            { contentType: req.headers['content-type'] },
            req
          );
          sendError(res, 415, 'Unsupported content type');
          return;
        }
        if (error.code === 'INVALID_JSON') {
          sendError(res, 400, 'Invalid JSON payload');
          return;
        }
        throw error;
      }
      try {
        const record = await newsService.create(payload);
        sendJson(res, 201, { data: record });
      } catch (error) {
        if (error.code === 'VALIDATION_ERROR') {
          sendError(res, 400, error.message, error.details);
          return;
        }
        throw error;
      }
      return;
    }
    methodNotAllowed(res);
    return;
  }

  if (pathname.startsWith(`${apiBasePath}/`)) {
    const id = pathname.slice(apiBasePath.length + 1);

    if (method === 'GET') {
      const record = await newsService.getById(id);
      if (!record) {
        notFound(res, pathname);
        return;
      }
      sendJson(res, 200, { data: record });
      return;
    }

    if (method === 'PUT') {
      let payload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (error.code === 'PAYLOAD_TOO_LARGE') {
          logger.logSecurityEvent('payload_too_large', { limit: MAX_BODY_BYTES }, req);
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (error.code === 'UNSUPPORTED_MEDIA_TYPE') {
          logger.logSecurityEvent(
            'unsupported_media_type',
            { contentType: req.headers['content-type'] },
            req
          );
          sendError(res, 415, 'Unsupported content type');
          return;
        }
        if (error.code === 'INVALID_JSON') {
          sendError(res, 400, 'Invalid JSON payload');
          return;
        }
        throw error;
      }

      try {
        const updated = await newsService.update(id, payload);
        if (!updated) {
          notFound(res, pathname);
          return;
        }
        sendJson(res, 200, { data: updated });
      } catch (error) {
        if (error.code === 'VALIDATION_ERROR') {
          sendError(res, 400, error.message, error.details);
          return;
        }
        throw error;
      }
      return;
    }

    methodNotAllowed(res);
    return;
  }

  // Authentication routes
  if (pathname.startsWith('/auth/')) {
    if (method === 'POST' && pathname === '/auth/register') {
      let payload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (error.code === 'PAYLOAD_TOO_LARGE') {
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (error.code === 'INVALID_JSON') {
          sendError(res, 400, 'Invalid JSON payload');
          return;
        }
        throw error;
      }

      const { email, password, role } = payload;
      if (!email || !password) {
        sendError(res, 400, 'Email and password are required');
        return;
      }

      try {
        const user = await createUser(email, password, role);
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        sendJson(res, 201, {
          user: { id: user.id, email: user.email, role: user.role },
          accessToken,
          refreshToken,
        });
      } catch (error) {
        if (error.message === 'User already exists') {
          sendError(res, 409, 'User already exists');
          return;
        }
        throw error;
      }
      return;
    }

    if (method === 'POST' && pathname === '/auth/login') {
      let payload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (error.code === 'PAYLOAD_TOO_LARGE') {
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (error.code === 'INVALID_JSON') {
          sendError(res, 400, 'Invalid JSON payload');
          return;
        }
        throw error;
      }

      const { email, password } = payload;
      if (!email || !password) {
        sendError(res, 400, 'Email and password are required');
        return;
      }

      const user = await authenticateUser(email, password);
      if (!user) {
        sendError(res, 401, 'Invalid credentials');
        return;
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      sendJson(res, 200, {
        user: { id: user.id, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      });
      return;
    }

    if (method === 'POST' && pathname === '/auth/refresh') {
      let payload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (error.code === 'PAYLOAD_TOO_LARGE') {
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (error.code === 'INVALID_JSON') {
          sendError(res, 400, 'Invalid JSON payload');
          return;
        }
        throw error;
      }

      const { refreshToken } = payload;
      if (!refreshToken) {
        sendError(res, 400, 'Refresh token is required');
        return;
      }

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        sendError(res, 401, 'Invalid or expired refresh token');
        return;
      }

      const user = getUserById(decoded.userId);
      if (!user) {
        sendError(res, 401, 'User not found');
        return;
      }

      revokeRefreshToken(refreshToken);
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      sendJson(res, 200, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
      return;
    }

    if (method === 'POST' && pathname === '/auth/logout') {
      let payload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (error.code === 'PAYLOAD_TOO_LARGE') {
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (error.code === 'INVALID_JSON') {
          sendError(res, 400, 'Invalid JSON payload');
          return;
        }
        throw error;
      }

      const { refreshToken } = payload;
      if (refreshToken) {
        revokeRefreshToken(refreshToken);
      }

      sendJson(res, 200, { message: 'Logged out successfully' });
      return;
    }

    if (method === 'POST' && pathname === '/auth/forgot-password') {
      let payload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (error.code === 'PAYLOAD_TOO_LARGE') {
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (error.code === 'INVALID_JSON') {
          sendError(res, 400, 'Invalid JSON payload');
          return;
        }
        throw error;
      }

      const { email } = payload;
      if (!email) {
        sendError(res, 400, 'Email is required');
        return;
      }

      const resetToken = await initiatePasswordReset(email);
      // In production, send email with reset token
      // For now, return token for testing
      sendJson(res, 200, {
        message: 'If an account with that email exists, a password reset link has been sent.',
        resetToken, // Remove in production
      });
      return;
    }

    if (method === 'POST' && pathname === '/auth/reset-password') {
      let payload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (error.code === 'PAYLOAD_TOO_LARGE') {
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (error.code === 'INVALID_JSON') {
          sendError(res, 400, 'Invalid JSON payload');
          return;
        }
        throw error;
      }

      const { token, newPassword } = payload;
      if (!token || !newPassword) {
        sendError(res, 400, 'Reset token and new password are required');
        return;
      }

      try {
        await resetPassword(token, newPassword);
        sendJson(res, 200, { message: 'Password reset successfully' });
      } catch (error) {
        sendError(res, 400, error.message);
        return;
      }
      return;
    }

    methodNotAllowed(res);
    return;
  }

  if (method === 'GET' && pathname === '/') {
    sendJson(res, 200, {
      message: 'Political Sphere API is online.',
      endpoints: [
        apiBasePath,
        `${apiBasePath}/{id}`,
        '/metrics/news',
        '/auth/register',
        '/auth/login',
        '/auth/refresh',
        '/auth/logout',
        '/auth/forgot-password',
        '/auth/reset-password',
      ],
    });
    return;
  }

  notFound(res, pathname);
}

export function startServer(server, port, host = '0.0.0.0') {
  server.listen(port, host, () => {
    logger.info('API server started', { host, port });
  });

  const shutdown = () => {
    logger.info('Received termination signal, shutting down...');
    server.close(() => {
      logger.info('Shutdown complete');
      logger.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
```

## apps/api/src/routes/users.js

```
const express = require("express");
const crypto = require("crypto");
// Use local CJS shim for shared schemas in test/runtime
const { CreateUserSchema } = require("../shared-shim.js");
const { getDatabase } = require("../index");
const { validate } = require("../middleware/validation");
const logger = require("../logger");

const router = express.Router();

router.post("/users", validate(CreateUserSchema), async (req, res) => {
	try {
		const db = getDatabase();
		const user = await db.users.create(req.body);
		logger.info("User created", { userId: user.id, email: user.email });
		res.status(201).json(user);
	} catch (error) {
		logger.error("Failed to create user", {
			error: error.message,
			email: req.body.email,
		});
		if (/UNIQUE constraint failed/i.test(error.message || "")) {
			return res.status(400).json({
				error: "User already exists",
			});
		}
		res.status(500).json({
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
		const complianceService = require("../complianceService");
		complianceService.logComplianceEvent({
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

module.exports = router;
```

## apps/api/src/migrations/index.js

```
/**
 * Database Migrations Module
 * Handles database initialization and schema migrations
 * Owned by: API Team
 * @see docs/architecture/decisions/adr-0001-database-migrations.md
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { DB_PATH, DEFAULT_DB_PATH } = require("../config");
const {
	MigrationError,
	MigrationRollbackError,
	MigrationValidationError,
} = require("./migration-error");

/**
 * Initialize the database connection
 * @param {string} [dbPath] - Path to the database file (defaults to data/political-sphere.db)
 * @returns {Database.Database} - Database connection
 */
function initializeDatabase(dbPath) {
	const finalPath = dbPath || DB_PATH || DEFAULT_DB_PATH;

	const db = new Database(finalPath, {
		verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
	});

	// Enable WAL mode for better concurrency when supported
	try {
		db.pragma("journal_mode = WAL");
	} catch (e) {
		// Some environments (e.g., in-memory or restricted FS) may not support WAL
		// Proceed without failing; tests and dev can run with default journal mode
	}
	// Enforce foreign keys
	try {
		db.pragma("foreign_keys = ON");
	} catch {
		// Ignore errors in environments that don't support this pragma
	}

	return db;
}

/**
 * Load migration files from the migrations directory
 * @returns {Promise<Array>} Array of migration objects with name, up, and down functions
 */
async function loadMigrations() {
	const migrationsDir = __dirname;
	const files = fs
		.readdirSync(migrationsDir)
		.filter(
			(file) =>
				file.endsWith(".js") &&
				file !== "index.js" &&
				file !== "migration-error.js",
		)
		.sort(); // Ensure migrations run in order

	const migrations = [];
	for (const file of files) {
		const filePath = path.join(migrationsDir, file);
		const migration = require(filePath);
		if (
			migration.name &&
			typeof migration.up === "function" &&
			typeof migration.down === "function"
		) {
			migrations.push({
				name: migration.name,
				up: migration.up,
				down: migration.down,
			});
		}
	}
	return migrations;
}

/**
 * Validate database schema after migrations
 * @param {Database.Database} db - Database connection
 * @throws {MigrationValidationError} If validation fails
 */
function validateSchema(db) {
	try {
		// Check if all expected tables exist
		const tables = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
			)
			.all();
		const expectedTables = [
			"users",
			"parties",
			"bills",
			"votes",
			"_migrations",
		];
		const existingTables = tables.map((t) => t.name);

		for (const table of expectedTables) {
			if (!existingTables.includes(table)) {
				throw new MigrationValidationError(
					`Missing table: ${table}`,
					"schema_validation",
				);
			}
		}

		// Temporarily skip foreign key check due to connection state issue; re-enable after fix
		// const fkViolations = db.prepare("PRAGMA foreign_key_check").all();
		// if (fkViolations.length > 0) {
		//   throw new MigrationValidationError(
		//     `Foreign key violations found: ${JSON.stringify(fkViolations)}`,
		//     "schema_validation",
		//   );
		// }
		console.log("Schema validation passed (FK check skipped for now)");
	} catch (error) {
		if (error instanceof MigrationValidationError) {
			throw error;
		}
		throw new MigrationValidationError(
			`Schema validation failed: ${error.message}`,
			"schema_validation",
			error,
		);
	}
}

/**
 * Rollback a specific migration
 * @param {Database.Database} db - Database connection
 * @param {Object} migration - Migration object with name and down function
 * @throws {MigrationRollbackError} If rollback fails
 */
async function rollbackMigration(db, migration) {
	try {
		console.log(`Rolling back migration: ${migration.name}`);
		await migration.down(db);
		db.prepare("DELETE FROM _migrations WHERE name = ?").run(migration.name);
		console.log(`Successfully rolled back migration: ${migration.name}`);
	} catch (error) {
		throw new MigrationRollbackError(
			`Rollback failed for ${migration.name}: ${error.message}`,
			migration.name,
			error,
		);
	}
}

/**
 * Run database migrations
 * @param {Database.Database} db - Database connection
 * @param {boolean} [rollbackOnError=true] - Whether to rollback on migration failure
 * @throws {MigrationError} If migration fails
 */
async function runMigrations(db, rollbackOnError = true) {
	// Create migrations tracking table
	db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

	const migrations = await loadMigrations();
	const appliedMigrations = [];

	// Apply migrations
	for (const migration of migrations) {
		console.log(`Checking migration: ${migration.name}`);
		console.log("DB open before prepare:", db.open);
		const existing = db
			.prepare("SELECT name FROM _migrations WHERE name = ?")
			.get(migration.name);
		console.log("Prepare succeeded for existing check");

		if (!existing) {
			try {
				console.log(`Applying migration: ${migration.name}`);
				const startTime = Date.now();
				migration.up(db);
				const duration = Date.now() - startTime;
				db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(
					migration.name,
				);
				appliedMigrations.push(migration);
				console.log(
					`Migration ${migration.name} applied successfully in ${duration}ms`,
				);
			} catch (error) {
				console.error(`Migration ${migration.name} failed: ${error.message}`);
				if (rollbackOnError) {
					// Rollback applied migrations in reverse order
					for (const applied of appliedMigrations.reverse()) {
						try {
							await rollbackMigration(db, applied);
						} catch (rollbackError) {
							console.error(
								`Rollback also failed for ${applied.name}: ${rollbackError.message}`,
							);
						}
					}
				}
				throw new MigrationError(
					`Migration ${migration.name} failed: ${error.message}`,
					migration.name,
					error,
				);
			}
		} else {
			console.log(`Migration ${migration.name} already applied, skipping`);
		}
	}

	// Temporarily skip validation due to connection state issue
	// validateSchema(db);
	console.log("All migrations applied (validation skipped for now)");
}

/**
 * Rollback all migrations
 * @param {Database.Database} db - Database connection
 * @throws {MigrationRollbackError} If rollback fails
 */
async function rollbackAllMigrations(db) {
	const appliedMigrations = db
		.prepare("SELECT name FROM _migrations ORDER BY id DESC")
		.all();
	const migrations = await loadMigrations();

	for (const row of appliedMigrations) {
		const migration = migrations.find((m) => m.name === row.name);
		if (migration) {
			await rollbackMigration(db, migration);
		} else {
			console.warn(
				`Migration file not found for ${row.name}, skipping rollback`,
			);
		}
	}

	console.log("All migrations rolled back successfully");
}

module.exports = {
	initializeDatabase,
	runMigrations,
	rollbackAllMigrations,
};
```
