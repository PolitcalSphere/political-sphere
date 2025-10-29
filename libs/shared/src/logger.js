// Structured logging utility for Political Sphere
// Implements best practices for production logging

import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// Log levels
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

class Logger {
  constructor(options = {}) {
    this.level = options.level || LOG_LEVELS.INFO;
    this.service = options.service || 'political-sphere';
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.console = options.console !== false;
    this.file = options.file;
    this.stream = null;
    
    if (this.file) {
      this.#initFileStream();
    }
  }

  async #initFileStream() {
    try {
      await mkdir(dirname(this.file), { recursive: true });
      this.stream = createWriteStream(this.file, { flags: 'a' });
    } catch (error) {
      console.error('Failed to initialize log file:', error);
    }
  }

  #formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: LOG_LEVEL_NAMES[level],
      service: this.service,
      environment: this.environment,
      message,
      ...meta
    };

    return JSON.stringify(logEntry);
  }

  #write(level, message, meta) {
    if (level < this.level) return;

    const formatted = this.#formatMessage(level, message, meta);

    // Console output (with colors in development)
    if (this.console) {
      if (this.environment === 'development') {
        const colors = {
          0: '\x1b[36m', // DEBUG - Cyan
          1: '\x1b[32m', // INFO - Green
          2: '\x1b[33m', // WARN - Yellow
          3: '\x1b[31m', // ERROR - Red
          4: '\x1b[35m'  // FATAL - Magenta
        };
        const reset = '\x1b[0m';
        console.log(`${colors[level]}${formatted}${reset}`);
      } else {
        console.log(formatted);
      }
    }

    // File output
    if (this.stream) {
      this.stream.write(formatted + '\n');
    }
  }

  debug(message, meta) {
    this.#write(LOG_LEVELS.DEBUG, message, meta);
  }

  info(message, meta) {
    this.#write(LOG_LEVELS.INFO, message, meta);
  }

  warn(message, meta) {
    this.#write(LOG_LEVELS.WARN, message, meta);
  }

  error(message, meta) {
    this.#write(LOG_LEVELS.ERROR, message, meta);
  }

  fatal(message, meta) {
    this.#write(LOG_LEVELS.FATAL, message, meta);
  }

  // HTTP request logging
  logRequest(req, res, duration) {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    if (res.statusCode >= 500) {
      this.error('HTTP request failed', meta);
    } else if (res.statusCode >= 400) {
      this.warn('HTTP client error', meta);
    } else {
      this.info('HTTP request', meta);
    }
  }

  // Security event logging
  logSecurityEvent(event, details, req) {
    const meta = {
      event,
      ...details,
      ip: req?.headers?.['x-forwarded-for']?.split(',')[0] || req?.socket?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
      timestamp: new Date().toISOString()
    };

    this.warn('SECURITY_EVENT', meta);
  }

  // Error logging with stack trace
  logError(error, context = {}) {
    const meta = {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      ...context
    };

    this.error('Application error', meta);
  }

  close() {
    if (this.stream) {
      this.stream.end();
    }
  }
}

// Singleton instance
let defaultLogger = null;

export function getLogger(options) {
  if (!defaultLogger) {
    defaultLogger = new Logger(options);
  }
  return defaultLogger;
}

export function createLogger(options) {
  return new Logger(options);
}

// Export Logger class for custom instances
export { Logger };
