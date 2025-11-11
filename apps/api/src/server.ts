import http from 'node:http';
import os from 'node:os';
import process from 'node:process';
import { URL } from 'node:url';

import {
  checkRateLimit,
  getCorsHeaders,
  getLogger,
  getRateLimitInfo,
  isIpAllowed,
  SECURITY_HEADERS,
} from '@political-sphere/shared';

import {
  authenticateUser,
  createUser,
  generateAccessToken,
  generateRefreshToken,
  getUserById,
  initiatePasswordReset,
  resetPassword,
  revokeRefreshToken,
  verifyRefreshToken,
} from './modules/auth.js';
import {
  methodNotAllowed,
  notFound,
  readJsonBody,
  sendError,
  sendJson,
} from './utils/http-utils.mjs';

function parsePositiveInt(value: string | undefined | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

/**
 * Type guard to check if error has a code property
 */
function hasErrorCode(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

/**
 * Type guard for validation errors with details
 */
function isValidationError(
  error: unknown
): error is { code: string; message: string; details?: unknown } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'VALIDATION_ERROR' &&
    'message' in error
  );
}

const RATE_LIMIT_OPTIONS = {
  maxRequests: parsePositiveInt(process.env.API_RATE_LIMIT_MAX_REQUESTS, 100),
  windowMs: parsePositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  maxKeys: parsePositiveInt(process.env.API_RATE_LIMIT_MAX_KEYS, 5000),
};

const RATE_LIMIT_WINDOW_SECONDS = Math.max(1, Math.floor(RATE_LIMIT_OPTIONS.windowMs / 1000));
const RATE_LIMIT_POLICY = `${RATE_LIMIT_OPTIONS.maxRequests};w=${RATE_LIMIT_WINDOW_SECONDS}`;
const MAX_BODY_BYTES = parsePositiveInt(process.env.API_MAX_BODY_BYTES, 1024 * 1024);

const _corsOptions: { exposedHeaders: string[] } = {
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'RateLimit-Policy',
  ],
};

function applyHeaders(
  res: http.ServerResponse,
  headers: Record<string, string | number | undefined>
): void {
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
          .flatMap(entry => String(entry).split(','))
          .map(entry => entry.trim())
          .filter(Boolean)
      );
      for (const token of incoming
        .split(',')
        .map(entry => entry.trim())
        .filter(Boolean)) {
        tokens.add(token);
      }
      res.setHeader('Vary', Array.from(tokens).join(', '));
      continue;
    }
    res.setHeader(key, value);
  }
}

const allowedLogLevels = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = (typeof allowedLogLevels)[number];
const logLevelString = process.env.LOG_LEVEL;
if (logLevelString && !allowedLogLevels.includes(logLevelString as LogLevel)) {
  throw new Error(
    `Invalid LOG_LEVEL: "${logLevelString}". Allowed values are: ${allowedLogLevels.join(', ')}`
  );
}
const logLevelMap = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;
const logLevel = logLevelString
  ? logLevelMap[logLevelString as (typeof allowedLogLevels)[number]]
  : undefined;
const logFile = process.env.LOG_FILE;
const logger = getLogger({
  service: 'api',
  ...(logLevel !== undefined && { level: logLevel }),
  ...(logFile !== undefined && { file: logFile }),
});

export interface NewsService {
  list(params: {
    category?: string;
    tag?: string;
    search?: string;
    limit?: string | undefined;
  }): Promise<unknown[]>;
  create(payload: unknown): Promise<unknown>;
  update(id: string, payload: unknown): Promise<unknown | null>;
  getById(id: string): Promise<unknown | null>;
  analyticsSummary(): Promise<unknown>;
}

export interface CreateServerOptions {
  basePath?: string;
}

export function createNewsServer(
  newsService: NewsService,
  options: CreateServerOptions = {}
): http.Server {
  const apiBasePath = options.basePath ?? '/api/news';
  const server = http.createServer(async (req, res) => {
    const startTime = Date.now();

    try {
      await handleRequest(req, res, newsService, apiBasePath);
    } catch (error: unknown) {
      logger.logError(error as Error, {
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

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  newsService: NewsService,
  apiBasePath: string
): Promise<void> {
  const method = req.method ?? 'GET';
  const originalUrl = req.url ?? '/';
  // Avoid trusting the Host header to reduce SSRF/open-redirect risk
  const url = new URL(originalUrl, 'http://localhost');
  const pathname = url.pathname;
  const forwardedForHeader =
    typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for']?.split(',')?.[0]?.trim()
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
    applyHeaders(res, getCorsHeaders(origin ?? ''));
    sendError(res, 403, 'Access denied');
    return;
  }

  // Rate limiting (exclude health checks)
  if (pathname !== '/healthz') {
    if (!checkRateLimit(clientIp, RATE_LIMIT_OPTIONS)) {
      logger.logSecurityEvent('rate_limit_exceeded', { ip: clientIp }, req);
      const rateLimitInfo = getRateLimitInfo(clientIp, RATE_LIMIT_OPTIONS);
      const retryAfter = Math.max(1, rateLimitInfo.reset);
      applyHeaders(res, getCorsHeaders(origin ?? ''));
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
  const corsHeaders = getCorsHeaders(origin ?? '');

  if (method === 'OPTIONS') {
    applyHeaders(res, corsHeaders);
    res.writeHead(204, { 'Content-Length': '0' });
    res.end();
    return;
  }

  applyHeaders(res, corsHeaders);

  if (method === 'GET' && pathname === '/healthz') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'api',
      hostname: os.hostname(),
    });
    return;
  }

  if (method === 'GET' && pathname === '/metrics/news') {
    const summary = await newsService.analyticsSummary();
    sendJson(res, 200, summary as Record<string, unknown>);
    return;
  }

  if (pathname === apiBasePath) {
    if (method === 'GET') {
      try {
        const category = url.searchParams.get('category');
        const tag = url.searchParams.get('tag');
        const search = url.searchParams.get('search');
        const limit = url.searchParams.get('limit');

        const list = await newsService.list({
          ...(category && { category }),
          ...(tag && { tag }),
          ...(search && { search }),
          ...(limit && { limit }),
        });
        sendJson(res, 200, { data: list });
      } catch (error) {
        if (isValidationError(error)) {
          sendError(res, 400, error.message, error.details);
          return;
        }
        throw error;
      }
      return;
    }
    if (method === 'POST') {
      let payload: unknown;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (hasErrorCode(error) && error.code === 'PAYLOAD_TOO_LARGE') {
          logger.logSecurityEvent('payload_too_large', { limit: MAX_BODY_BYTES }, req);
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (hasErrorCode(error) && error.code === 'UNSUPPORTED_MEDIA_TYPE') {
          logger.logSecurityEvent(
            'unsupported_media_type',
            { contentType: req.headers['content-type'] },
            req
          );
          sendError(res, 415, 'Unsupported content type');
          return;
        }
        if (hasErrorCode(error) && error.code === 'INVALID_JSON') {
          sendError(res, 400, 'Invalid JSON payload');
          return;
        }
        throw error;
      }
      try {
        const record = await newsService.create(payload);
        sendJson(res, 201, { data: record });
      } catch (error) {
        if (isValidationError(error)) {
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
      let payload: unknown;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (hasErrorCode(error) && error.code === 'PAYLOAD_TOO_LARGE') {
          logger.logSecurityEvent('payload_too_large', { limit: MAX_BODY_BYTES }, req);
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (hasErrorCode(error) && error.code === 'UNSUPPORTED_MEDIA_TYPE') {
          logger.logSecurityEvent(
            'unsupported_media_type',
            { contentType: req.headers['content-type'] },
            req
          );
          sendError(res, 415, 'Unsupported content type');
          return;
        }
        if (hasErrorCode(error) && error.code === 'INVALID_JSON') {
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
        if (isValidationError(error)) {
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
      interface RegisterPayload {
        email?: string;
        password?: string;
        role?: string;
      }
      let payload: RegisterPayload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (hasErrorCode(error) && error.code === 'PAYLOAD_TOO_LARGE') {
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (hasErrorCode(error) && error.code === 'INVALID_JSON') {
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
          user: {
            id: (user as any).id,
            email: (user as any).email,
            role: (user as any).role,
          },
          accessToken,
          refreshToken,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'User already exists') {
          sendError(res, 409, 'User already exists');
          return;
        }
        throw error;
      }
      return;
    }

    if (method === 'POST' && pathname === '/auth/login') {
      interface LoginPayload {
        email?: string;
        password?: string;
      }
      let payload: LoginPayload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (hasErrorCode(error) && error.code === 'PAYLOAD_TOO_LARGE') {
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (hasErrorCode(error) && error.code === 'INVALID_JSON') {
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
        user: {
          id: (user as any).id,
          email: (user as any).email,
          role: (user as any).role,
        },
        accessToken,
        refreshToken,
      });
      return;
    }

    if (method === 'POST' && pathname === '/auth/refresh') {
      interface RefreshPayload {
        refreshToken?: string;
      }
      let payload: RefreshPayload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (hasErrorCode(error) && error.code === 'PAYLOAD_TOO_LARGE') {
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (hasErrorCode(error) && error.code === 'INVALID_JSON') {
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
      if (!decoded || typeof decoded === 'string') {
        sendError(res, 401, 'Invalid or expired refresh token');
        return;
      }

      if (
        typeof decoded === 'object' &&
        decoded !== null &&
        'userId' in decoded &&
        typeof (decoded as any).userId === 'string'
      ) {
        const user = getUserById((decoded as { userId: string }).userId);
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
      } else {
        sendError(res, 401, 'Invalid or expired refresh token');
      }
      return;
    }

    if (method === 'POST' && pathname === '/auth/logout') {
      interface LogoutPayload {
        refreshToken?: string;
      }
      let payload: LogoutPayload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (hasErrorCode(error) && error.code === 'PAYLOAD_TOO_LARGE') {
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (hasErrorCode(error) && error.code === 'INVALID_JSON') {
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
      interface ForgotPasswordPayload {
        email?: string;
      }
      let payload: ForgotPasswordPayload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (hasErrorCode(error) && error.code === 'PAYLOAD_TOO_LARGE') {
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (hasErrorCode(error) && error.code === 'INVALID_JSON') {
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
      interface ResetPasswordPayload {
        token?: string;
        newPassword?: string;
      }
      let payload: ResetPasswordPayload;
      try {
        payload = await readJsonBody(req, { limit: MAX_BODY_BYTES });
      } catch (error) {
        if (hasErrorCode(error) && error.code === 'PAYLOAD_TOO_LARGE') {
          sendError(res, 413, 'Payload too large');
          return;
        }
        if (hasErrorCode(error) && error.code === 'INVALID_JSON') {
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
        sendError(res, 400, (error as Error).message);
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
        '/users',
        '/users/{id}',
        '/parties',
        '/parties/{id}',
        '/bills',
        '/bills/{id}',
        '/votes',
        '/bills/{id}/votes',
        '/bills/{id}/vote-counts',
      ],
      security: {
        rateLimit: RATE_LIMIT_POLICY,
        maxBodyBytes: MAX_BODY_BYTES,
        corsEnabled: true,
        securityHeaders: true,
        authenticationRequired: true,
      },
    });
    return;
  }

  notFound(res, pathname);
}

export function startServer(server: http.Server, port: number, host = '0.0.0.0'): void {
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
