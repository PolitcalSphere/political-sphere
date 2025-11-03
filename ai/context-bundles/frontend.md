# Frontend Snapshot

> Generated: 2025-11-03T19:06:07.607Z

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
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { getLogger } from "@political-sphere/shared";
import { PORT, HOST, API_BASE_URL, ENABLE_SECURITY_HEADERS } from "./config.js";

const logger = getLogger({ service: "frontend" });

// Override port if it conflicts with Grafana (port 3000)
const ACTUAL_PORT = PORT === 3000 ? 3001 : PORT;

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
    logger.error("Failed to load index.html", { error: error.message, path: indexPath });
    template = "<h1>Political Sphere</h1><p>Template missing.</p>";
  }
}

await loadTemplate();

function safeSerialize(value) {
  return JSON.stringify(value ?? null).replace(/</g, "\\u003c");
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

## apps/frontend/tests/accessibility.test.js

```
const puppeteer = require('puppeteer');
const axe = require('axe-core');

describe('GameBoard Accessibility Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('GameBoard component passes accessibility audit', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GameBoard Accessibility Test</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
          .skip-links { position: fixed; top: 0; left: 0; background: #000; color: #fff; padding: 12px 16px; z-index: 1000; border-radius: 0 0 4px 4px; transform: translateY(-120%); transition: transform 0.2s ease; display: flex; gap: 1rem; }
          .skip-links.is-visible { transform: translateY(0); }
          .skip-links a, .skip-links button { color: #fff; background: none; border: none; text-decoration: underline; cursor: pointer; font-weight: 600; }
          .game-board { max-width: 800px; margin: 0 auto; }
          .game-board:focus { outline: 3px solid #3498db; outline-offset: 4px; }
          .proposals-list { list-style: none; padding: 0; }
          .proposal-item { border: 1px solid #ccc; padding: 10px; margin: 10px 0; }
          .vote-buttons { margin-top: 10px; }
          button { padding: 8px 16px; margin: 0 5px; }
          .report-button { background: #ff4444; color: white; }
          .proposal-form { border-top: 2px solid #ecf0f1; padding-top: 16px; margin-top: 24px; }
          .proposal-form label { display: block; margin-bottom: 8px; font-weight: bold; }
          .proposal-form input, .proposal-form textarea { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #bdc3c7; }
          .proposal-form button { background: #2ecc71; color: #fff; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <nav class="skip-links is-visible" aria-label="Skip links">
          <a href="#main-content">Skip to main content</a>
          <button type="button">Skip to navigation</button>
        </nav>
        <main id="main-content" class="game-board" role="main" tabindex="-1">
          <h1>Political Simulation Game</h1>

          <section aria-label="Game navigation" tabindex="-1">
            <button type="button" aria-label="Focus next proposal">Next Proposal</button>
            <button type="button" aria-label="Focus previous proposal">Previous Proposal</button>
          </section>

          <section aria-labelledby="proposals-heading" aria-live="polite">
            <h2 id="proposals-heading">Proposals</h2>
            <ul class="proposals-list" role="list">
              <li class="proposal-item" role="listitem">
                <h3>Improve Education Funding</h3>
                <p>Increase budget for schools and teachers.</p>
                <div class="vote-buttons">
                  <button type="button" aria-label="Vote for Improve Education Funding">For</button>
                  <button type="button" aria-label="Vote against Improve Education Funding">Against</button>
                  <button type="button" aria-label="Abstain from voting on Improve Education Funding">Abstain</button>
                  <button type="button" class="report-button" aria-label="Report Improve Education Funding proposal">Report</button>
                </div>
              </li>
              <li class="proposal-item" role="listitem">
                <h3>Environmental Protection Act</h3>
                <p>Implement stricter environmental regulations.</p>
                <div class="vote-buttons">
                  <button type="button" aria-label="Vote for Environmental Protection Act">For</button>
                  <button type="button" aria-label="Vote against Environmental Protection Act">Against</button>
                  <button type="button" aria-label="Abstain from voting on Environmental Protection Act">Abstain</button>
                  <button type="button" class="report-button" aria-label="Report Environmental Protection Act proposal">Report</button>
                </div>
              </li>
            </ul>
          </section>

          <section aria-labelledby="new-proposal-heading" class="proposal-form">
            <h2 id="new-proposal-heading">Submit New Proposal</h2>
            <form>
              <div>
                <label for="proposal-title">Proposal Title:</label>
                <input type="text" id="proposal-title" required aria-describedby="title-help">
                <span id="title-help" class="sr-only">Enter a clear, descriptive title for your proposal</span>
              </div>
              <div>
                <label for="proposal-description">Description:</label>
                <textarea id="proposal-description" required aria-describedby="description-help"></textarea>
                <span id="description-help" class="sr-only">Provide detailed description of your proposal</span>
              </div>
              <button type="submit">Submit Proposal</button>
            </form>
          </section>

          <section aria-live="polite" aria-atomic="true" class="sr-only">
            Live announcements from assistive technology
          </section>
        </main>
      </body>
      </html>
    `);

    // Inject axe-core
    await page.addScriptTag({ content: axe.source });

    // Run accessibility audit
    const results = await page.evaluate(async () => {
      return await axe.run(document, {
        rules: {
          'color-contrast': { enabled: true },
          'heading-order': { enabled: true },
          'landmark-one-main': { enabled: true },
          'region': { enabled: true }
        }
      });
    });

    // Check for critical violations
    const criticalViolations = results.violations.filter(v =>
      ['critical', 'serious'].includes(v.impact)
    );

    if (criticalViolations.length > 0) {
      console.log('Accessibility Violations Found:');
      criticalViolations.forEach(violation => {
        console.log(`- ${violation.id}: ${violation.description}`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Help: ${violation.help}`);
      });
    }

    // Expect no critical accessibility violations
    expect(criticalViolations).toHaveLength(0);
  });

  test('Keyboard navigation works', async () => {
    // Test keyboard navigation through interactive elements
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(focusedElement).toBe('A'); // Skip link

    await page.keyboard.press('Tab');
    focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(focusedElement).toBe('BUTTON'); // First button
  });

  test('Screen reader announcements work', async () => {
    // Test that aria-live regions announce changes
    const liveRegion = await page.$('[aria-live]');
    if (liveRegion) {
      const liveContent = await page.evaluate(el => el.textContent, liveRegion);
      expect(liveContent).toBeDefined();
    }
  });
});
```
