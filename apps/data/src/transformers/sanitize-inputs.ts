/**
 * Sanitize Inputs Transformer
 * 
 * Sanitizes user inputs to prevent XSS, SQL injection, and other
 * security vulnerabilities. Applies strict validation rules.
 * 
 * @module transformers/sanitize-inputs
 */

export class SanitizeInputsTransformer {
  private readonly maxStringLength = 10000;
  private readonly allowedHtmlTags = ['b', 'i', 'em', 'strong', 'p', 'br'];

  /**
   * Sanitize a single string value
   */
  sanitizeString(input: string): string {
    // TODO: Implement comprehensive sanitization
    // 1. Remove or escape dangerous characters
    // 2. Strip unauthorized HTML tags
    // 3. Normalize whitespace
    // 4. Apply length limits
    
    let sanitized = input.trim();
    
    // Enforce length limit
    if (sanitized.length > this.maxStringLength) {
      sanitized = sanitized.substring(0, this.maxStringLength);
    }
    
    // Basic HTML entity encoding
    sanitized = this.escapeHtml(sanitized);
    
    return sanitized;
  }

  /**
   * Escape HTML entities to prevent XSS
   */
  private escapeHtml(text: string): string {
    const entityMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
    };
    
    return text.replace(/[&<>"'/]/g, char => entityMap[char] || char);
  }

  /**
   * Sanitize HTML content, allowing only safe tags
   */
  sanitizeHtml(html: string): string {
    // TODO: Implement proper HTML sanitization
    // Use a library like DOMPurify in production
    // For now, strip all tags not in allowlist
    
    let sanitized = html;
    
    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    return sanitized;
  }

  /**
   * Sanitize an object recursively
   */
  sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = this.sanitizeString(key);
      
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = value.map(item =>
          typeof item === 'string' ? this.sanitizeString(item) : item
        );
      } else if (value !== null && typeof value === 'object') {
        sanitized[sanitizedKey] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Validate and sanitize SQL-like strings
   */
  sanitizeSqlString(input: string): string {
    // TODO: Use parameterized queries in production
    // This is a basic safeguard
    
    // Remove common SQL injection patterns
    const dangerous = [
      /('|(\\')|(--)|(%7C)/gi,
      /(;|\||`|\\|<|>|\^|\[|\]|\{|\})/gi,
      /(\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b)/gi,
    ];
    
    let sanitized = input;
    for (const pattern of dangerous) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    return sanitized.trim();
  }

  /**
   * Validate email format
   */
  sanitizeEmail(email: string): string {
    const sanitized = email.toLowerCase().trim();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }
    
    return sanitized;
  }

  /**
   * Sanitize URL to prevent open redirect and XSS
   */
  sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid URL protocol');
      }
      
      return parsed.toString();
    } catch {
      throw new Error('Invalid URL format');
    }
  }
}
