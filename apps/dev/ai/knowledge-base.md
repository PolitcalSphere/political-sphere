# AI Knowledge Base

## Code Patterns and Templates

### Error Handling Pattern

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export const errorHandler = (error: Error): never => {
  if (error instanceof AppError && error.isOperational) {
    // Log operational errors
    logger.error(error.message, {
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    });
  } else {
    // Log programming errors
    logger.error('Unexpected error', {
      error: error.message,
      stack: error.stack,
    });
  }

  throw error;
};
```

### Database Repository Pattern

```typescript
export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export class BaseRepository<T extends { id: string }> implements Repository<T> {
  constructor(
    private prisma: PrismaClient,
    private modelName: keyof PrismaClient
  ) {}

  async findById(id: string): Promise<T | null> {
    return this.prisma[this.modelName].findUnique({
      where: { id },
    }) as Promise<T | null>;
  }

  async findAll(filter?: Partial<T>): Promise<T[]> {
    return this.prisma[this.modelName].findMany({
      where: filter,
    }) as Promise<T[]>;
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    return this.prisma[this.modelName].create({
      data,
    }) as Promise<T>;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return this.prisma[this.modelName].update({
      where: { id },
      data,
    }) as Promise<T>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma[this.modelName].delete({
      where: { id },
    });
  }
}
```

### Authentication Middleware

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
```

### Logging Utility

```typescript
import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'political-sphere' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

// Request logging middleware
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
};
```

### Configuration Management

```typescript
import { z } from 'zod';

const configSchema = z.object({
  nodeEnv: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  port: z.number().default(3000),
  database: z.object({
    url: z.string().url(),
    maxConnections: z.number().default(10),
  }),
  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.string().default('24h'),
  }),
  redis: z.object({
    url: z.string().url().optional(),
  }),
  externalApis: z.object({
    someService: z
      .object({
        baseUrl: z.string().url(),
        apiKey: z.string(),
        timeout: z.number().default(5000),
      })
      .optional(),
  }),
});

type Config = z.infer<typeof configSchema>;

const loadConfig = (): Config => {
  const config = {
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT || '3000'),
    database: {
      url: process.env.DATABASE_URL!,
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    },
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    redis: {
      url: process.env.REDIS_URL,
    },
    externalApis: {
      someService: process.env.SOME_SERVICE_API_KEY
        ? {
            baseUrl:
              process.env.SOME_SERVICE_BASE_URL ||
              'https://api.someservice.com',
            apiKey: process.env.SOME_SERVICE_API_KEY,
            timeout: parseInt(process.env.SOME_SERVICE_TIMEOUT || '5000'),
          }
        : undefined,
    },
  };

  return configSchema.parse(config);
};

export const config = loadConfig();
```

## Best Practices

### Security

- Always validate input using Zod schemas
- Use parameterized queries for database operations
- Implement rate limiting on API endpoints
- Store secrets in environment variables only
- Use HTTPS for all external communications

### Performance

- Implement caching for expensive operations
- Use database indexes for frequently queried fields
- Implement pagination for large result sets
- Use streaming for large file operations
- Monitor memory usage and implement garbage collection

### Testing

- Write tests before implementation (TDD)
- Aim for 80%+ code coverage
- Test both happy path and error scenarios
- Use realistic test data
- Mock external dependencies

### Monitoring

- Log all errors with context
- Implement health check endpoints
- Monitor response times and error rates
- Set up alerts for critical issues
- Use structured logging with correlation IDs

## Architecture Patterns

### Clean Architecture

```
├── domain/          # Business logic, entities, use cases
├── application/     # Application services, DTOs, interfaces
├── infrastructure/  # External concerns (DB, APIs, frameworks)
└── presentation/    # Controllers, routes, views
```

### CQRS Pattern

```typescript
// Commands (write operations)
export interface Command {
  type: string;
  payload: any;
}

export class CreateUserCommand implements Command {
  type = 'CREATE_USER';
  constructor(public payload: { email: string; name: string }) {}
}

// Queries (read operations)
export interface Query {
  type: string;
  payload: any;
}

export class GetUserQuery implements Query {
  type = 'GET_USER';
  constructor(public payload: { id: string }) {}
}

// Handlers
export interface CommandHandler<T extends Command> {
  execute(command: T): Promise<void>;
}

export interface QueryHandler<T extends Query, R> {
  execute(query: T): Promise<R>;
}
```

### Event Sourcing

```typescript
export interface Event {
  id: string;
  type: string;
  aggregateId: string;
  version: number;
  timestamp: Date;
  payload: any;
}

export class UserCreatedEvent implements Event {
  id = crypto.randomUUID();
  type = 'USER_CREATED';
  timestamp = new Date();

  constructor(
    public aggregateId: string,
    public version: number,
    public payload: { email: string; name: string }
  ) {}
}

export class EventStore {
  async save(events: Event[]): Promise<void> {
    // Persist events
  }

  async getEvents(aggregateId: string): Promise<Event[]> {
    // Retrieve events for aggregate
  }
}
```

## Performance Optimization Techniques

### Database Optimization

- Use EXPLAIN ANALYZE to understand query execution
- Implement proper indexing strategies
- Use connection pooling
- Implement query result caching
- Use database views for complex queries

### Application Optimization

- Implement response compression
- Use CDN for static assets
- Implement horizontal scaling
- Use background job processing
- Implement circuit breakers for external services

### Caching Strategies

```typescript
// Multi-level caching
export class CacheManager {
  constructor(
    private memoryCache: MemoryCache,
    private redisCache: RedisCache,
    private database: Database
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    let value = await this.memoryCache.get<T>(key);
    if (value) return value;

    // Check Redis cache
    value = await this.redisCache.get<T>(key);
    if (value) {
      // Warm memory cache
      await this.memoryCache.set(key, value);
      return value;
    }

    // Check database
    value = await this.database.get<T>(key);
    if (value) {
      // Warm caches
      await Promise.all([
        this.memoryCache.set(key, value),
        this.redisCache.set(key, value),
      ]);
    }

    return value;
  }
}
```
