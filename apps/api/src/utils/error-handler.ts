import type { NextFunction, Request, Response } from "express";
import { sanitizeErrorForLog } from "./log-sanitizer";

export class ErrorHandler {
  static handleError(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Security: Sanitize error data before logging to prevent log injection
    const sanitizedError = sanitizeErrorForLog(
      err,
      req as unknown as Record<string, unknown>
    );
    console.error("Error:", sanitizedError);

    // Don't leak internal errors
    const isDevelopment = process.env.NODE_ENV === "development";
    const message = isDevelopment ? err.message : "Internal server error";

    // Determine status code
    let statusCode = 500;
    if (err.name === "ValidationError") {
      statusCode = 400;
    } else if (err.name === "UnauthorizedError") {
      statusCode = 401;
    } else if (err.name === "NotFoundError") {
      statusCode = 404;
    } else if (err.name === "ConflictError") {
      statusCode = 409;
    } else if (err.name === "RateLimitError") {
      statusCode = 429;
    } else if (err.name === "DatabaseError") {
      statusCode = 500;
    } else if (err.name === "ExternalServiceError") {
      statusCode = 502;
    }

    res.status(statusCode).json({
      error: {
        type: err.name,
        message,
        ...(isDevelopment && { stack: err.stack }),
      },
    });
  }

  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

// Custom error classes
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends Error {
  constructor(message: string = "Too many requests") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class ExternalServiceError extends Error {
  constructor(service: string, message: string) {
    super(`${service}: ${message}`);
    this.name = "ExternalServiceError";
  }
}

// Circuit breaker for external services
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private monitoringPeriod: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new ExternalServiceError(
          "CircuitBreaker",
          "Service is currently unavailable"
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  getState() {
    return this.state;
  }
}

// Retry mechanism with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};
