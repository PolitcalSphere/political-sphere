// Security utility functions for the Political Sphere API
// Implements OWASP best practices for input validation and sanitization

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import process from 'node:process';

const DEFAULT_ALLOWED_PROTOCOLS = ['http', 'https'];

const DEFAULT_ALLOWED_ORIGINS = [
  'https://political-sphere.com',
  'https://www.political-sphere.com',
  'https://staging.political-sphere.com',
];

const DEFAULT_RATE_LIMIT = Object.freeze({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000,
  maxKeys: 5000,
});

const DEFAULT_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
const DEFAULT_ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-CSRF-Token'];
const DEFAULT_EXPOSED_HEADERS = ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'];

const DEFAULT_SECURITY_DIRECTIVES = Object.freeze({
  'default-src': new Set(["'self'"]),
  'script-src': new Set(["'self'"]),
  'style-src': new Set(["'self'"]),
  'img-src': new Set(["'self'", 'data:', 'https:']),
  'font-src': new Set(["'self'"]),
  'connect-src': new Set(["'self'"]),
  'frame-ancestors': new Set(["'none'"]),
  'base-uri': new Set(["'self'"]),
  'form-action': new Set(["'self'"]),
});

const VALID_CATEGORIES = new Set([
  'politics',
  'economy',
  'social',
  'technology',
  'environment',
  'health',
  'finance',
  'governance',
  'policy',
  'general',
]);

const ALLOWED_STATUSES = new Set(['draft', 'published', 'archived']);

/**
 * Validates and sanitizes HTML input to prevent XSS attacks
 * @param {string} input - The HTML string to sanitize
 * @returns {string} - Sanitized HTML string
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates input against common injection patterns
 * @param {string} input - The string to validate
 * @returns {boolean} - True if input is safe
 */
export function isValidInput(input) {
  if (typeof input !== 'string') return false;
  
  // Check for common injection patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /eval\(/i,
    /expression\(/i,
    /vbscript:/i,
    /\.\.\//, // Path traversal
    /SELECT.*FROM/i, // SQL injection
    /UNION.*SELECT/i,
    /INSERT.*INTO/i,
    /DROP.*TABLE/i,
    /DELETE.*FROM/i,
    /UPDATE.*SET/i,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email is valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates URL format and protocol
 * @param {string} url - URL to validate
 * @param {string[]} allowedProtocols - Allowed protocols (default: ['http', 'https'])
 * @returns {boolean} - True if URL is valid
 */
export function isValidUrl(url, allowedProtocols = ['http', 'https']) {
  try {
    const parsed = new URL(url);
    return allowedProtocols.includes(parsed.protocol.replace(':', ''));
  } catch {
    return false;
  }
}

/**
 * Validates string length
 * @param {string} input - String to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean} - True if length is valid
 */
export function isValidLength(input, min = 1, max = 10000) {
  if (typeof input !== 'string') return false;
  return input.length >= min && input.length <= max;
}

function resolveSecret(envKey, fallback) {
  const candidate = process.env[envKey];
  if (candidate && candidate !== fallback) {
    return candidate;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${envKey} must be set to a secure value in production environments`);
  }
  return fallback;
}

/**
 * Generates a secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Hex-encoded random token
 */
export function generateSecureToken(length = 32) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new TypeError('Token length must be a positive integer');
  }
  return randomBytes(length).toString('hex');
}

/**
 * Hashes a value using SHA-256
 * @param {string} value - Value to hash
 * @returns {string} - Hex-encoded hash
 */
export function hashValue(value) {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Validates and sanitizes category input
 * @param {string} category - Category to validate
 * @returns {string|null} - Sanitized category or null if invalid
 */
export function validateCategory(category) {
  if (typeof category !== 'string') return null;
  const sanitized = category.toLowerCase().trim();
  
  return VALID_CATEGORIES.has(sanitized) ? sanitized : null;
}

/**
 * Validates and sanitizes tag input
 * @param {string} tag - Tag to validate
 * @returns {string|null} - Sanitized tag or null if invalid
 */
export function validateTag(tag) {
  if (typeof tag !== 'string') return null;
  
  const sanitized = tag.trim();
  
  // Tags should be alphanumeric with hyphens/underscores, 2-30 chars
  const tagRegex = /^[a-zA-Z0-9_-]{2,30}$/;
  
  return tagRegex.test(sanitized) ? sanitized : null;
}

/**
 * Rate limiter storage (in-memory, use Redis in production)
 */
const rateLimitStore = new Map();

function normalizeRateLimitOptions(options = {}) {
  if (typeof options === 'number') {
    return {
      maxRequests: Number.isFinite(options) ? Math.max(1, Math.floor(options)) : DEFAULT_RATE_LIMIT.maxRequests,
      windowMs: DEFAULT_RATE_LIMIT.windowMs,
      maxKeys: DEFAULT_RATE_LIMIT.maxKeys,
    };
  }

  const maxRequests = Number.isFinite(options.maxRequests)
    ? Math.max(1, Math.floor(options.maxRequests))
    : DEFAULT_RATE_LIMIT.maxRequests;

  const windowMs = Number.isFinite(options.windowMs)
    ? Math.max(1000, Math.floor(options.windowMs))
    : DEFAULT_RATE_LIMIT.windowMs;

  const maxKeys = Number.isFinite(options.maxKeys)
    ? Math.max(1, Math.floor(options.maxKeys))
    : DEFAULT_RATE_LIMIT.maxKeys;

  return { maxRequests, windowMs, maxKeys };
}

function ensureRateLimitCapacity(maxKeys) {
  const overflow = rateLimitStore.size - maxKeys;
  if (overflow <= 0) return;
  const keys = rateLimitStore.keys();
  for (let i = 0; i < overflow; i += 1) {
    const key = keys.next().value;
    if (!key) break;
    rateLimitStore.delete(key);
  }
}

/**
 * Simple in-memory rate limiter
 * @param {string} key - Unique identifier (e.g., IP address)
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if request is allowed
 */
export function checkRateLimit(key, options = DEFAULT_RATE_LIMIT) {
  const { maxRequests, windowMs, maxKeys } = normalizeRateLimitOptions(options);

  const now = Date.now();
  const record = rateLimitStore.get(key) || {
    count: 0,
    resetTime: now + windowMs,
    maxRequests,
    windowMs,
  };
  
  // Reset if window has passed
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }
  
  record.count++;
  record.maxRequests = maxRequests;
  record.windowMs = windowMs;
  rateLimitStore.set(key, record);

  ensureRateLimitCapacity(maxKeys);
  
  return record.count <= maxRequests;
}

/**
 * Get rate limit info for a key
 * @param {string} key - Unique identifier
 * @returns {Object} - Rate limit status
 */
export function getRateLimitInfo(key, options = DEFAULT_RATE_LIMIT) {
  const { maxRequests, windowMs } = normalizeRateLimitOptions(options);
  const record = rateLimitStore.get(key) || {
    count: 0,
    resetTime: Date.now() + windowMs,
    maxRequests,
    windowMs,
  };
  const now = Date.now();
  const remaining = Math.max(0, record.maxRequests - record.count);
  const resetSeconds = Math.max(0, Math.ceil((record.resetTime - now) / 1000));
  
  return {
    remaining,
    reset: resetSeconds,
    limit: record.maxRequests,
  };
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
const cleanupInterval = setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

/**
 * Generates CSRF token
 * @param {string} sessionId - Session identifier
 * @returns {string} - CSRF token
 */
export function generateCsrfToken(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new TypeError('sessionId must be a non-empty string');
  }

  const secret = resolveSecret('CSRF_SECRET', 'change-me-in-production');
  const timestamp = Date.now().toString();
  const token = createHash('sha256')
    .update(`${sessionId}${timestamp}${secret}`)
    .digest('hex');
  
  return `${timestamp}.${token}`;
}

/**
 * Validates CSRF token
 * @param {string} token - CSRF token to validate
 * @param {string} sessionId - Session identifier
 * @param {number} maxAge - Maximum token age in milliseconds (default: 1 hour)
 * @returns {boolean} - True if token is valid
 */
export function validateCsrfToken(token, sessionId, maxAge = 60 * 60 * 1000) {
  if (!token || typeof token !== 'string') return false;
  
  const [timestamp, hash] = token.split('.');
  if (!timestamp || !hash) return false;
  
  const tokenAge = Date.now() - parseInt(timestamp, 10);
  if (tokenAge > maxAge || tokenAge < 0) return false;
  
  const secret = resolveSecret('CSRF_SECRET', 'change-me-in-production');
  const expectedHash = createHash('sha256')
    .update(`${sessionId}${timestamp}${secret}`)
    .digest('hex');

  try {
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    const providedBuffer = Buffer.from(hash, 'hex');
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function cloneSecurityDirectiveMap() {
  const next = new Map();
  for (const [directive, values] of Object.entries(DEFAULT_SECURITY_DIRECTIVES)) {
    next.set(directive, new Set(values));
  }
  return next;
}

/**
 * Security headers configuration
 */
export function createSecurityHeaders(options = {}) {
  const {
    scriptNonce,
    connectSrc = [],
    styleSrc = [],
    imgSrc = [],
    fontSrc = [],
    frameAncestors = ["'none'"],
    formAction = ["'self'"],
    baseUri = ["'self'"],
    upgradeInsecureRequests = false,
    referrerPolicy = 'strict-origin-when-cross-origin',
    permissionsPolicy = 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
    crossOriginEmbedderPolicy = 'require-corp',
    crossOriginOpenerPolicy = 'same-origin',
    crossOriginResourcePolicy = 'same-origin',
  } = options;

  const directives = cloneSecurityDirectiveMap();

  if (scriptNonce) {
    directives.get('script-src').add(`'nonce-${scriptNonce}'`);
  }

  for (const value of connectSrc) directives.get('connect-src').add(value);
  for (const value of styleSrc) directives.get('style-src').add(value);
  for (const value of imgSrc) directives.get('img-src').add(value);
  for (const value of fontSrc) directives.get('font-src').add(value);

  directives.set('frame-ancestors', new Set(frameAncestors.length ? frameAncestors : ["'none'"]));
  directives.set('form-action', new Set(formAction.length ? formAction : ["'self'"]));
  directives.set('base-uri', new Set(baseUri.length ? baseUri : ["'self'"]));

  if (upgradeInsecureRequests) {
    directives.set('upgrade-insecure-requests', new Set());
  }

  const csp = Array.from(directives.entries())
    .map(([directive, values]) => {
      if (values.size === 0) return directive;
      return `${directive} ${Array.from(values).join(' ')}`;
    })
    .join('; ');

  const frameOptions = frameAncestors.includes("'none'") ? 'DENY' : 'SAMEORIGIN';

  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': frameOptions,
    'X-XSS-Protection': '1; mode=block',
    'X-DNS-Prefetch-Control': 'off',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Referrer-Policy': referrerPolicy,
    'Permissions-Policy': permissionsPolicy,
    'Cross-Origin-Embedder-Policy': crossOriginEmbedderPolicy,
    'Cross-Origin-Opener-Policy': crossOriginOpenerPolicy,
    'Cross-Origin-Resource-Policy': crossOriginResourcePolicy,
    'Content-Security-Policy': csp,
  };
}

export const SECURITY_HEADERS = Object.freeze(createSecurityHeaders());

function resolveAllowedOrigins(customOrigins = []) {
  const envOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const devOrigins =
    process.env.NODE_ENV === 'development'
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']
      : [];

  return Array.from(
    new Set([
      ...DEFAULT_ALLOWED_ORIGINS,
      ...customOrigins.filter(Boolean),
      ...envOrigins,
      ...devOrigins,
    ]),
  );
}

/**
 * CORS configuration
 */
export function getCorsHeaders(origin, options = {}) {
  const {
    allowedOrigins = resolveAllowedOrigins(options.additionalAllowedOrigins ?? []),
    allowCredentials = true,
    allowedMethods = DEFAULT_ALLOWED_METHODS,
    allowedHeaders = DEFAULT_ALLOWED_HEADERS,
    exposedHeaders = DEFAULT_EXPOSED_HEADERS,
    maxAgeSeconds = 86400,
  } = options;

  const headers = {
    Vary: 'Origin',
  };

  if (!origin || typeof origin !== 'string') {
    return headers;
  }

  const normalizedOrigin = origin.trim();

  if (allowedOrigins.includes(normalizedOrigin)) {
    headers['Access-Control-Allow-Origin'] = normalizedOrigin;
    headers['Access-Control-Allow-Methods'] = allowedMethods.join(', ');
    headers['Access-Control-Allow-Headers'] = allowedHeaders.join(', ');
    headers['Access-Control-Expose-Headers'] = exposedHeaders.join(', ');
    headers['Access-Control-Max-Age'] = String(maxAgeSeconds);
    if (allowCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  }

  return headers;
}

/**
 * Validates request IP against allowlist/blocklist
 * @param {string} ip - IP address to validate
 * @param {string[]} blocklist - IPs to block
 * @returns {boolean} - True if IP is allowed
 */
export function isIpAllowed(ip, blocklist = []) {
  if (typeof ip !== 'string' || !ip) {
    return false;
  }

  if (blocklist.includes(ip)) return false;
  
  // Additional IP validation logic can be added here
  return true;
}

export { ALLOWED_STATUSES as NEWS_ALLOWED_STATUSES };
