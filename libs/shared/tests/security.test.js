import { describe, test, expect } from '@jest/globals';
import {
  sanitizeHtml,
  isValidInput,
  isValidLength,
  isValidEmail,
  isValidUrl,
  validateCategory,
  validateTag,
  checkRateLimit,
  generateSecureToken,
  hashValue,
  generateCsrfToken,
  validateCsrfToken,
  SECURITY_HEADERS,
  createSecurityHeaders,
  getCorsHeaders,
  isIpAllowed,
  getRateLimitInfo
} from '../src/security.js';

describe('Security Utilities', () => {
  describe('sanitizeHtml', () => {
    test('escapes HTML entities', () => {
      const input = '<script>alert("xss")</script>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('<script>');
      expect(output).toContain('&lt;script&gt;');
    });

    test('escapes quotes', () => {
      const input = '"quoted" and \'single\'';
      const output = sanitizeHtml(input);
      expect(output).toContain('&quot;');
      expect(output).toContain('&#x27;');
    });

    test('handles empty strings', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    test('handles non-string input', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
      expect(sanitizeHtml(123)).toBe('');
    });
  });

  describe('isValidInput', () => {
    test('rejects script tags', () => {
      expect(isValidInput('<script>alert(1)</script>')).toBe(false);
    });

    test('rejects javascript: protocol', () => {
      expect(isValidInput('javascript:alert(1)')).toBe(false);
    });

    test('rejects event handlers', () => {
      expect(isValidInput('<div onclick="alert(1)">test</div>')).toBe(false);
    });

    test('rejects SQL injection patterns', () => {
      expect(isValidInput("' OR '1'='1")).toBe(false);
      expect(isValidInput('SELECT * FROM users')).toBe(false);
      expect(isValidInput('DROP TABLE users')).toBe(false);
    });

    test('rejects path traversal', () => {
      expect(isValidInput('../../../etc/passwd')).toBe(false);
    });

    test('accepts safe input', () => {
      expect(isValidInput('This is safe text')).toBe(true);
      expect(isValidInput('Email: test@example.com')).toBe(true);
    });

    test('handles non-string input', () => {
      expect(isValidInput(null)).toBe(false);
      expect(isValidInput(undefined)).toBe(false);
      expect(isValidInput(123)).toBe(false);
    });
  });

  describe('isValidLength', () => {
    test('validates within range', () => {
      expect(isValidLength('test', 1, 10)).toBe(true);
    });

    test('rejects too short', () => {
      expect(isValidLength('', 1, 10)).toBe(false);
    });

    test('rejects too long', () => {
      expect(isValidLength('a'.repeat(101), 1, 100)).toBe(false);
    });

    test('handles edge cases', () => {
      expect(isValidLength('a', 1, 1)).toBe(true);
      expect(isValidLength('ab', 1, 1)).toBe(false);
    });

    test('handles non-string input', () => {
      expect(isValidLength(null, 1, 10)).toBe(false);
      expect(isValidLength(123, 1, 10)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    test('validates correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    test('rejects invalid emails', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });

    test('rejects too long emails', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    test('validates HTTPS URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    test('validates HTTP URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    test('rejects javascript: protocol', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    test('rejects data: protocol by default', () => {
      expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    test('respects allowed protocols', () => {
      expect(isValidUrl('ftp://example.com', ['ftp'])).toBe(true);
      expect(isValidUrl('ftp://example.com', ['http', 'https'])).toBe(false);
    });

    test('handles invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
    });
  });

  describe('validateCategory', () => {
    test('validates correct categories', () => {
      expect(validateCategory('politics')).toBe('politics');
      expect(validateCategory('economy')).toBe('economy');
      expect(validateCategory('POLITICS')).toBe('politics'); // Case insensitive
    });

    test('rejects invalid categories', () => {
      expect(validateCategory('invalid')).toBe(null);
      expect(validateCategory('')).toBe(null);
    });

    test('handles non-string input', () => {
      expect(validateCategory(null)).toBe(null);
      expect(validateCategory(123)).toBe(null);
    });

    test('trims whitespace', () => {
      expect(validateCategory('  politics  ')).toBe('politics');
    });
  });

  describe('validateTag', () => {
    test('validates correct tags', () => {
      expect(validateTag('valid-tag')).toBe('valid-tag');
      expect(validateTag('tag_123')).toBe('tag_123');
    });

    test('rejects tags with spaces', () => {
      expect(validateTag('invalid tag')).toBe(null);
    });

    test('rejects too short tags', () => {
      expect(validateTag('a')).toBe(null);
    });

    test('rejects too long tags', () => {
      expect(validateTag('a'.repeat(31))).toBe(null);
    });

    test('rejects special characters', () => {
      expect(validateTag('tag@!')).toBe(null);
      expect(validateTag('<script>')).toBe(null);
    });

    test('trims whitespace', () => {
      expect(validateTag('  valid-tag  ')).toBe('valid-tag');
    });
  });

  describe('checkRateLimit', () => {
    const options = { maxRequests: 5, windowMs: 1000, maxKeys: 100 };

    test('allows requests within limit and reports remaining capacity', () => {
      const key = `test-user-${Date.now()}`;
      for (let i = 0; i < options.maxRequests; i += 1) {
        expect(checkRateLimit(key, options)).toBe(true);
      }
      const info = getRateLimitInfo(key, options);
      expect(info.limit).toBe(options.maxRequests);
      expect(info.remaining).toBe(0);
      expect(info.reset).toBeGreaterThanOrEqual(0);
    });

    test('blocks requests exceeding limit', () => {
      const key = `test-user-${Math.random()}`;
      for (let i = 0; i < options.maxRequests; i += 1) {
        checkRateLimit(key, options);
      }
      expect(checkRateLimit(key, options)).toBe(false);
      const info = getRateLimitInfo(key, options);
      expect(info.remaining).toBe(0);
      expect(info.limit).toBe(options.maxRequests);
    });
  });

  describe('generateSecureToken', () => {
    test('generates random tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    test('generates tokens of correct length', () => {
      const token = generateSecureToken(32);
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    test('generates hex-encoded strings', () => {
      const token = generateSecureToken();
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });

  describe('hashValue', () => {
    test('hashes values consistently', () => {
      const hash1 = hashValue('test');
      const hash2 = hashValue('test');
      expect(hash1).toBe(hash2);
    });

    test('produces different hashes for different inputs', () => {
      const hash1 = hashValue('test1');
      const hash2 = hashValue('test2');
      expect(hash1).not.toBe(hash2);
    });

    test('produces 64-character hex strings', () => {
      const hash = hashValue('test');
      expect(hash.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });
  });

  describe('CSRF tokens', () => {
    test('generates CSRF tokens', () => {
      const token = generateCsrfToken('session-123');
      expect(token).toBeTruthy();
      expect(token).toContain('.');
    });

    test('validates correct CSRF tokens', () => {
      const sessionId = 'session-123';
      const token = generateCsrfToken(sessionId);
      expect(validateCsrfToken(token, sessionId)).toBe(true);
    });

    test('rejects invalid CSRF tokens', () => {
      const sessionId = 'session-123';
      expect(validateCsrfToken('invalid.token', sessionId)).toBe(false);
    });

    test('rejects tokens for different sessions', () => {
      const token = generateCsrfToken('session-123');
      expect(validateCsrfToken(token, 'session-456')).toBe(false);
    });

    test('rejects expired tokens', () => {
      const sessionId = 'session-123';
      const oldTimestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      const token = `${oldTimestamp}.fakehash`;
      expect(validateCsrfToken(token, sessionId, 60 * 60 * 1000)).toBe(false);
    });
  });

  describe('SECURITY_HEADERS', () => {
    test('includes all required headers', () => {
      expect(SECURITY_HEADERS).toHaveProperty('Strict-Transport-Security');
      expect(SECURITY_HEADERS).toHaveProperty('X-Content-Type-Options');
      expect(SECURITY_HEADERS).toHaveProperty('X-Frame-Options');
      expect(SECURITY_HEADERS).toHaveProperty('Content-Security-Policy');
      expect(SECURITY_HEADERS).toHaveProperty('X-XSS-Protection');
      expect(SECURITY_HEADERS).toHaveProperty('Referrer-Policy');
    });

    test('CSP includes important directives', () => {
      const csp = SECURITY_HEADERS['Content-Security-Policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain('frame-ancestors');
    });
  });

  describe('getCorsHeaders', () => {
    test('allows whitelisted origins', () => {
      const headers = getCorsHeaders('http://localhost:3000');
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    });

    test('rejects non-whitelisted origins', () => {
      const headers = getCorsHeaders('http://malicious-site.com');
      expect(headers).toEqual({});
    });

    test('includes credentials flag for allowed origins', () => {
      const headers = getCorsHeaders('http://localhost:3000');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });
  });

  describe('isIpAllowed', () => {
    test('allows IPs not in blocklist', () => {
      expect(isIpAllowed('192.168.1.1', [])).toBe(true);
    });

    test('blocks IPs in blocklist', () => {
      expect(isIpAllowed('192.168.1.1', ['192.168.1.1'])).toBe(false);
    });
  });
});
