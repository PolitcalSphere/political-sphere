/**
 * Log sanitization utilities to prevent log injection attacks (TypeScript version)
 * Reference: OWASP A03:2021 Injection, CWE-117
 */

/**
 * Sanitizes a string value for safe logging by removing control characters
 * and limiting length to prevent log flooding
 */
export function sanitizeLogString(
  value: string,
  maxLength: number = 1000
): string {
  if (typeof value !== "string") {
    return String(value);
  }

  // Remove control characters including newlines, carriage returns, and other special chars
  // that could be used to forge log entries
  let sanitized = value
    .replace(/\n/g, " ") // newline
    .replace(/\r/g, " ") // carriage return
    .replace(/\t/g, " "); // tab

  // Remove all other control characters using character codes to avoid regex lint warnings
  sanitized = sanitized
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      // Keep printable characters (32-126) and extended ASCII (160+)
      return (code >= 32 && code <= 126) || code >= 160;
    })
    .join("");

  // Truncate to prevent log flooding
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + "... (truncated)";
  }

  return sanitized;
}

/**
 * Sanitizes an object for safe logging by sanitizing all string values
 */
export function sanitizeLogObject(
  obj: unknown,
  maxLength: number = 1000
): Record<string, unknown> {
  if (!obj || typeof obj !== "object") {
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeLogString(value, maxLength);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeLogString(item, maxLength) : item
      );
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizeLogObject(value, maxLength);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Sanitizes HTTP request data for safe logging
 */
export function sanitizeRequestForLog(
  req: Record<string, unknown>
): Record<string, unknown> {
  return {
    method: req.method, // Safe: HTTP method is controlled
    url: sanitizeLogString((req.url as string) || "", 500), // Sanitize: user-controlled
    ip: sanitizeLogString((req.ip as string) || "", 50), // Sanitize: could be spoofed
    userAgent: sanitizeLogString(
      (req as { get?: (key: string) => string }).get?.("User-Agent") || "",
      500
    ), // Sanitize: user-controlled
    requestId: req.requestId, // Safe: generated server-side
  };
}

/**
 * Sanitizes error data for safe logging
 */
export function sanitizeErrorForLog(
  err: Error,
  req?: Record<string, unknown>
): Record<string, unknown> {
  return {
    message: sanitizeLogString(err.message || "", 500),
    name: err.name, // Safe: error name is controlled
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req ? sanitizeLogString((req.url as string) || "", 500) : undefined,
    method: req?.method, // Safe: HTTP method is controlled
    timestamp: new Date().toISOString(),
  };
}
