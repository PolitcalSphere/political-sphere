// Type definitions for logger.js

export const LOG_LEVELS: {
  DEBUG: number;
  INFO: number;
  WARN: number;
  ERROR: number;
  FATAL: number;
};

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
  constructor(options?: LoggerOptions);
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
  fatal(message: string, meta?: LogMeta): void;
  logRequest(req: IncomingMessage, res: ServerResponse, duration: number): void;
  logSecurityEvent(event: string, details: LogMeta, req?: IncomingMessage): void;
  logError(error: Error, context?: LogMeta): void;
  close(): void;
}

export function getLogger(options?: LoggerOptions): Logger;
export function createLogger(options?: LoggerOptions): Logger;
