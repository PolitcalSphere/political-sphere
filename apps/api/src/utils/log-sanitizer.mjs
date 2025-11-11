/**
 * Log sanitization utilities to prevent log injection attacks
 * Reference: OWASP A03:2021 Injection, CWE-117
 *
 * ESM Module - Converted from CommonJS 2025-11-11
 */

/**
 * Sanitizes a string value for safe logging by removing control characters
 * and limiting length to prevent log flooding
 * @param {string} value - The value to sanitize
 * @param {number} maxLength - Maximum length (default: 1000)
 * @returns {string} Sanitized value safe for logging
 */
export function sanitizeLogString(value, maxLength = 1000) {
  if (typeof value !== 'string') {
    return String(value);
  }

  // Remove control characters including newlines, carriage returns, and other special chars
  // that could be used to forge log entries
  let sanitized = value
    .replace(/\n/g, ' ') // newline
    .replace(/\r/g, ' ') // carriage return
    .replace(/\t/g, ' '); // tab

  // Remove all other control characters using character codes to avoid regex lint warnings
  sanitized = sanitized
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0);
      // Keep printable characters (32-126) and extended ASCII (160+)
      return (code >= 32 && code <= 126) || code >= 160;
    })
    .join('');

  // Truncate to prevent log flooding
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '... (truncated)';
  }

  return sanitized;
}

/**
 * Sanitizes an object for safe logging by sanitizing all string values
 * @param {Object} obj - The object to sanitize
 * @param {number} maxLength - Maximum string length
 * @returns {Object} Sanitized object safe for logging
 */
export function sanitizeLogObject(obj, maxLength = 1000) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeLogString(value, maxLength);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeLogString(item, maxLength) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeLogObject(value, maxLength);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Sanitizes HTTP request data for safe logging
 * @param {Object} req - Express request object
 * @returns {Object} Sanitized request data
 */
export function sanitizeRequestForLog(req) {
  return {
    method: req.method, // Safe: HTTP method is controlled
    url: sanitizeLogString(req.url, 500), // Sanitize: user-controlled
    ip: sanitizeLogString(req.ip, 50), // Sanitize: could be spoofed
    userAgent: sanitizeLogString(req.get('User-Agent') || '', 500), // Sanitize: user-controlled
    requestId: req.requestId, // Safe: generated server-side
  };
}
