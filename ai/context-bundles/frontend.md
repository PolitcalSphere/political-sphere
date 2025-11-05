# Frontend Snapshot

> Generated: 2025-11-05T14:54:38.658Z

## apps/frontend/README.md

```
# Frontend Shell

The frontend service renders a dashboard-backed HTML page, embedding live data from the API summary endpoints while still keeping dependencies intentionally lightweight.

## Features

- Serves `apps/frontend/public/index.html`, injecting the API base URL and initial data payload.
- Fetches `/api/news` and `/metrics/news` at request time to pre-render the latest dataset.
- Exposes `GET /healthz` for monitoring and `/` for the dashboard.
- Auto-reloads the HTML template when a POST to `/__reload` is received (handy for future tooling).

## Running locally

```bash
npm run start:frontend
# or
npx nx serve frontend
```

By default the dashboard listens on `FRONTEND_PORT` (3000) and queries `API_BASE_URL`, which should match the API container URL inside Docker Compose (`http://api:4000`). If the API is unavailable, the service renders an empty dashboard with a warning banner.

## Follow-up ideas

- Replace the hard-coded HTML with a real React/Next.js host once the Module Federation plan is finalized.
- Add smoke tests that confirm the rendered markup includes the latest policy signals.
- Integrate with the design system from `libs/ui` when it becomes available.
```

## apps/frontend/src/server.js

```
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const logger = console;

// Override port if it conflicts with Grafana (port 3000)
const ACTUAL_PORT = 3002;
const HOST = "0.0.0.0";
const API_BASE_URL = "http://localhost:4000";
const ENABLE_SECURITY_HEADERS = true;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");
const indexPath = path.join(publicDir, "index.html");

let template = "";

// Security headers for frontend
const SECURITY_HEADERS = {
	"Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"X-XSS-Protection": "1; mode=block",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "geolocation=(), microphone=(), camera=()",
	"Content-Security-Policy": [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline'",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: https:",
		"font-src 'self'",
		"connect-src 'self' http://localhost:4000 http://localhost:3000",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	].join("; "),
};

async function loadTemplate() {
	try {
		template = await readFile(indexPath, "utf8");
	} catch (error) {
		logger.error("Failed to load index.html", {
			error: error.message,
			path: indexPath,
		});
		template = "<h1>Political Sphere</h1><p>Template missing.</p>";
	}
}

await loadTemplate();

function safeSerialize(value) {
  const json = JSON.stringify(value ?? null);
  return json.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function fetchJson(pathname) {
	const response = await fetch(new URL(pathname, API_BASE_URL));
	if (!response.ok) {
		throw new Error(`API responded with ${response.status}`);
	}
	return response.json();
}

function renderIndex({ news, summary, statusMessage }) {
	const replacements = {
		__API_BASE_URL__: API_BASE_URL,
		__LAST_UPDATED__: new Date().toLocaleString(),
		__INITIAL_NEWS__: safeSerialize(news),
		__NEWS_SUMMARY__: safeSerialize(summary),
		__STATUS_MESSAGE__: statusMessage,
	};

	let html = template;
	for (const [key, value] of Object.entries(replacements)) {
		html = html.replaceAll(key, value);
	}
	return html;
}

const server = http.createServer(async (req, res) => {
	const method = req.method ?? "GET";
	const url = req.url ?? "/";

	// Apply security headers to all responses if enabled
	if (ENABLE_SECURITY_HEADERS) {
		Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
			res.setHeader(key, value);
		});
	}

	if (method === "GET" && (url === "/" || url === "/index.html")) {
		let news = [];
		let summary = { total: 0, categories: {}, tags: {}, latest: null };
		let statusMessage = "Live data retrieved from API.";
		try {
			const [newsResponse, summaryResponse] = await Promise.all([
				fetchJson("/api/news"),
				fetchJson("/metrics/news"),
			]);
			news = Array.isArray(newsResponse?.data) ? newsResponse.data : [];
			summary = summaryResponse ?? summary;
		} catch (error) {
			statusMessage = `API unavailable: ${error.message}`;
			logger.warn("Falling back to empty dashboard", {
				error: error.message,
				apiUrl: API_BASE_URL,
			});
		}

		res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
		res.end(renderIndex({ news, summary, statusMessage }));
		return;
	}

	if (method === "GET" && url === "/healthz") {
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ status: "ok", service: "frontend" }));
		return;
	}

	if (method === "POST" && url === "/__reload") {
		await loadTemplate();
		res.writeHead(204);
		res.end();
		return;
	}

	res.writeHead(404, { "Content-Type": "application/json" });
	res.end(JSON.stringify({ error: "Not Found", path: url }));
});

function gracefulShutdown() {
	logger.info("Received termination signal, shutting down...");
	server.close(() => {
		logger.info("Shutdown complete");
		process.exit(0);
	});
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

server.listen(ACTUAL_PORT, HOST, () => {
	logger.info("Frontend server started", {
		host: HOST,
		port: ACTUAL_PORT,
		apiBaseUrl: API_BASE_URL,
		securityHeadersEnabled: true,
	});
});
```
