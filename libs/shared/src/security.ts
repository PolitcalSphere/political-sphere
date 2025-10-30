// Security utility functions for the Political Sphere API
// Implements OWASP best practices for input validation and sanitization

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from 'node:process';

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

// Export ALLOWED_STATUSES as NEWS_ALLOWED_STATUSES for API compatibility
export const NEWS_ALLOWED_STATUSES = ALLOWED_STATUSES;

// Rate limiting store (in-memory for now)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CSRF token store (in-memory for now)
const csrfTokenStore = new Map<string, { token: string; created: number }>();

/**
 * Sanitizes HTML input to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Basic HTML sanitization - replace dangerous tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<[^>]*>/g, ''); // Remove all remaining HTML tags
}

/**
 * Validates general input for security
 */
export function isValidInput(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  // Check for null bytes
  if (input.includes('\0')) {
    return false;
  }

  // Check for overly long input (DOS prevention)
  if (input.length > 10000) {
    return false;
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//,  // Directory traversal
    /<\s*script/i,  // Script tags
    /javascript:/i,  // JavaScript URLs
    /data:\s*text\/html/i,  // Data URLs with HTML
    /('|(\\x27)|(\\x2D\\x2D)|(;)|(\\\\)|(\\')|(\\")|(\\x23)|(\\x3B)|(\\x2F\\x2A)|(\\x2A\\x2F))/i,  // SQL injection patterns
  ];

  return !suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates URL format and protocol
 */
export function isValidUrl(url: string, allowedProtocols: string[] = DEFAULT_ALLOWED_PROTOCOLS): boolean {
  if (typeof url !== 'string') {
    return false;
  }

  try {
    const parsedUrl = new URL(url);

    // Check protocol
    if (!allowedProtocols.includes(parsedUrl.protocol.replace(':', ''))) {
      return false;
    }

    // Check for localhost in production
    if (env['NODE_ENV'] === 'production' &&
        (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates string length
 */
export function isValidLength(input: string, min: number = 0, max: number = 10000): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  return input.length >= min && input.length <= max;
}

/**
 * Generates a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hashes a value using SHA-256
 */
export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Validates category against allowed values
 */
export function validateCategory(category: string): string | null {
  if (typeof category !== 'string') {
    return null;
  }

  const normalized = category.toLowerCase().trim();
  return VALID_CATEGORIES.has(normalized) ? normalized : null;
}

/**
 * Validates tag format
 */
export function validateTag(tag: string): string | null {
  if (typeof tag !== 'string') {
    return null;
  }

  const trimmed = tag.trim();

  // Check length
  if (trimmed.length < 2 || trimmed.length > 50) {
    return null;
  }

  // Check for valid characters (alphanumeric, spaces, hyphens, underscores)
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Checks rate limit for a given key
 */
export function checkRateLimit(key: string, optionsOrMaxRequests?: number | { maxRequests?: number; windowMs?: number }, windowMs?: number): boolean {
  let maxRequests: number;
  let windowDuration: number;

  if (typeof optionsOrMaxRequests === 'object' && optionsOrMaxRequests !== null) {
    maxRequests = optionsOrMaxRequests.maxRequests ?? DEFAULT_RATE_LIMIT.maxRequests;
    windowDuration = optionsOrMaxRequests.windowMs ?? DEFAULT_RATE_LIMIT.windowMs;
  } else {
    maxRequests = optionsOrMaxRequests ?? DEFAULT_RATE_LIMIT.maxRequests;
    windowDuration = windowMs ?? DEFAULT_RATE_LIMIT.windowMs;
  }

  const now = Date.now();
  const windowKey = `${key}:${Math.floor(now / windowDuration)}`;

  const current = rateLimitStore.get(windowKey) || { count: 0, resetTime: now + windowDuration };

  if (now > current.resetTime) {
    // Reset window
    rateLimitStore.set(windowKey, { count: 1, resetTime: now + windowDuration });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  rateLimitStore.set(windowKey, current);
  return true;
}

/**
 * Gets rate limit information for a key
 */
export function getRateLimitInfo(key: string, options?: { maxRequests?: number; windowMs?: number }): { remaining: number; reset: number; limit: number } {
  const maxRequests = options?.maxRequests ?? DEFAULT_RATE_LIMIT.maxRequests;
  const windowMs = options?.windowMs ?? DEFAULT_RATE_LIMIT.windowMs;

  const now = Date.now();
  const windowKey = `${key}:${Math.floor(now / windowMs)}`;

  const current = rateLimitStore.get(windowKey);

  if (!current || now > current.resetTime) {
    return { remaining: maxRequests, reset: Math.floor((now + windowMs) / 1000), limit: maxRequests };
  }

  const remaining = Math.max(0, maxRequests - current.count);
  return { remaining, reset: Math.floor(current.resetTime / 1000), limit: maxRequests };
}

/**
 * Cleans up expired rate limit entries
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();

  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Generates a CSRF token for a session
 */
export function generateCsrfToken(sessionId: string): string {
  const token = generateSecureToken(32);
  const created = Date.now();

  csrfTokenStore.set(sessionId, { token, created });

  // Clean up old tokens periodically
  if (Math.random() < 0.01) { // 1% chance
    cleanupCsrfTokens();
  }

  return token;
}

/**
 * Validates a CSRF token
 */
export function validateCsrfToken(token: string, sessionId: string, maxAge: number = 3600000): boolean {
  const stored = csrfTokenStore.get(sessionId);

  if (!stored) {
    return false;
  }

  // Check age
  if (Date.now() - stored.created > maxAge) {
    csrfTokenStore.delete(sessionId);
    return false;
  }

  // Use timing-safe comparison
  try {
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(stored.token, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Checks if an IP address is allowed (not blocked)
 * Allows localhost and private IPs by default
 */
export function isIpAllowed(ip: string, blocklist: string[] = []): boolean {
  // Validate IP format
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // Check explicit blocklist first
  if (blocklist.includes(ip)) {
    return false;
  }

  // Allow localhost IPs
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return true;
  }

  // Allow private IP ranges (RFC 1918)
  const privateIpPatterns = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^fc00:/,                   // IPv6 unique local addresses
    /^fe80:/,                   // IPv6 link-local
  ];

  return privateIpPatterns.some(pattern => pattern.test(ip));
}

/**
 * Security headers for HTTP responses
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

/**
 * Gets CORS headers for a request
 */
export function getCorsHeaders(origin: string): Record<string, string> {
  const isAllowedOrigin = DEFAULT_ALLOWED_ORIGINS.includes(origin) ||
    (env['NODE_ENV'] !== 'production' && origin?.includes('localhost'));

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '',
    'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS.join(', '),
    'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS.join(', '),
    'Access-Control-Expose-Headers': DEFAULT_EXPOSED_HEADERS.join(', '),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Cleans up expired CSRF tokens
 */
function cleanupCsrfTokens(): void {
  const now = Date.now();
  const maxAge = 3600000; // 1 hour

  for (const [sessionId, data] of csrfTokenStore.entries()) {
    if (now - data.created > maxAge) {
      csrfTokenStore.delete(sessionId);
    }
  }
}