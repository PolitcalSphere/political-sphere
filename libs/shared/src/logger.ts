// Structured logging utility for Political Sphere
// Implements best practices for production logging

import { createWriteStream, WriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { IncomingMessage, ServerResponse } from 'node:http';

// Log levels
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
} as const;

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const;

export interface LoggerOptions {
  level?: number;
  service?: string;
  environment?: string;
  console?: boolean;
  file?: string;
}

export interface LogMeta {
  [key: string]: unknown;
}

export class Logger {
  private level: number;
  private service: string;
  private environment: string;
  private console: boolean;
  private file?: string;
  private stream: WriteStream | null = null;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LOG_LEVELS.INFO;
    this.service = options.service ?? 'political-sphere';
    this.environment = options.environment ?? process.env['NODE_ENV'] ?? 'development';
    this.console = options.console !== false;
    this.file = options.file;

    if (this.file) {
      this.initFileStream();
    }
  }

  private async initFileStream(): Promise<void> {
    if (!this.file) return;

    try {
      await mkdir(dirname(this.file), { recursive: true });
      this.stream = createWriteStream(this.file, { flags: 'a' });
    } catch (error) {
      console.error('Failed to initialize log file:', error);
    }
  }

  private formatMessage(level: number, message: string, meta: LogMeta = {}): string {
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

  private write(level: number, message: string, meta?: LogMeta): void {
    if (level < this.level) return;

    const formatted = this.formatMessage(level, message, meta);

    // Console output (with colors in development)
    if (this.console) {
      if (this.environment === 'development') {
        const colors = {
          0: '\x1b[36m', // DEBUG - Cyan
          1: '\x1b[32m', // INFO - Green
          2: '\x1b[33m', // WARN - Yellow
          3: '\x1b[31m', // ERROR - Red
          4: '\x1b[35m'  // FATAL - Magenta
        } as const;
        const reset = '\x1b[0m';
        console.log(`${colors[level as keyof typeof colors]}${formatted}${reset}`);
      } else {
        console.log(formatted);
      }
    }

    // File output
    if (this.stream) {
      this.stream.write(formatted + '\n');
    }
  }

  debug(message: string, meta?: LogMeta): void {
    this.write(LOG_LEVELS.DEBUG, message, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this.write(LOG_LEVELS.INFO, message, meta);
  }

  warn(message: string, meta?: LogMeta): void {
    this.write(LOG_LEVELS.WARN, message, meta);
  }

  error(message: string, meta?: LogMeta): void {
    this.write(LOG_LEVELS.ERROR, message, meta);
  }

  fatal(message: string, meta?: LogMeta): void {
    this.write(LOG_LEVELS.FATAL, message, meta);
  }

  // HTTP request logging
  logRequest(req: IncomingMessage, res: ServerResponse, duration: number): void {
    const statusCode = (res as ServerResponse & { statusCode: number }).statusCode;
    const meta: LogMeta = {
      method: req.method,
      url: req.url,
      statusCode,
      duration: `${duration}ms`,
      ip: req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    if (statusCode >= 500) {
      this.error('HTTP request failed', meta);
    } else if (statusCode >= 400) {
      this.warn('HTTP client error', meta);
    } else {
      this.info('HTTP request', meta);
    }
  }

  // Security event logging
  logSecurityEvent(event: string, details: LogMeta, req?: IncomingMessage): void {
    const meta: LogMeta = {
      event,
      ...details,
      ip: req?.headers?.['x-forwarded-for']?.toString().split(',')[0] ?? req?.socket?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
      timestamp: new Date().toISOString()
    };

    this.warn('SECURITY_EVENT', meta);
  }

  // Error logging with stack trace
  logError(error: Error, context: LogMeta = {}): void {
    const meta: LogMeta = {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      ...context
    };

    this.error('Application error', meta);
  }

  close(): void {
    if (this.stream) {
      this.stream.end();
    }
  }
}

// Singleton instance
let defaultLogger: Logger | null = null;

export function getLogger(options?: LoggerOptions): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger(options);
  }
  return defaultLogger;
}

export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}