import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const PORT = Number.parseInt(process.env.FRONTEND_PORT ?? '3000', 10);
const HOST = process.env.FRONTEND_HOST ?? '0.0.0.0';
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');
const indexPath = path.join(publicDir, 'index.html');

let template = '';

// Security headers for frontend
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' http://localhost:4000 http://localhost:3000",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

async function loadTemplate() {
  try {
    template = await readFile(indexPath, 'utf8');
  } catch (error) {
    console.error('[frontend] Failed to load index.html', error);
    template = '<h1>Political Sphere</h1><p>Template missing.</p>';
  }
}

await loadTemplate();

function safeSerialize(value) {
  return JSON.stringify(value ?? null).replace(/</g, '\\u003c');
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
    '__API_BASE_URL__': API_BASE_URL,
    '__LAST_UPDATED__': new Date().toLocaleString(),
    '__INITIAL_NEWS__': safeSerialize(news),
    '__NEWS_SUMMARY__': safeSerialize(summary),
    '__STATUS_MESSAGE__': statusMessage,
  };

  let html = template;
  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(key, value);
  }
  return html;
}

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const url = req.url ?? '/';

  // Apply security headers to all responses
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (method === 'GET' && (url === '/' || url === '/index.html')) {
    let news = [];
    let summary = { total: 0, categories: {}, tags: {}, latest: null };
    let statusMessage = 'Live data retrieved from API.';
    try {
      const [newsResponse, summaryResponse] = await Promise.all([
        fetchJson('/api/news'),
        fetchJson('/metrics/news'),
      ]);
      news = Array.isArray(newsResponse?.data) ? newsResponse.data : [];
      summary = summaryResponse ?? summary;
    } catch (error) {
      statusMessage = `API unavailable: ${error.message}`;
      console.warn('[frontend] Falling back to empty dashboard', error);
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderIndex({ news, summary, statusMessage }));
    return;
  }

  if (method === 'GET' && url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'frontend' }));
    return;
  }

  if (method === 'POST' && url === '/__reload') {
    await loadTemplate();
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found', path: url }));
});

function gracefulShutdown() {
  console.log('[frontend] Received termination signal, shutting down...');
  server.close(() => {
    console.log('[frontend] Shutdown complete.');
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

server.listen(PORT, HOST, () => {
  console.log(`[frontend] Listening on ${HOST}:${PORT}`);
  console.log(`[frontend] API base URL: ${API_BASE_URL}`);
  console.log(`[frontend] Security headers enabled`);
});
