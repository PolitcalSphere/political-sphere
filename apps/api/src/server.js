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
  getLogger
} from '@political-sphere/shared';

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
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'RateLimit-Policy'],
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
          .filter(Boolean),
      );
      for (const token of incoming.split(',').map((entry) => entry.trim()).filter(Boolean)) {
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
  file: process.env.LOG_FILE
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
        ip: req.socket.remoteAddress
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
  const forwardedForHeader = typeof req.headers['x-forwarded-for'] === 'string'
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
        },
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
            req,
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
            req,
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

  if (method === 'GET' && pathname === '/') {
    sendJson(res, 200, {
      message: 'Political Sphere API is online.',
      endpoints: [apiBasePath, `${apiBasePath}/{id}`, '/metrics/news'],
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
