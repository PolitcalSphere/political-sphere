---
description: "Backend API design, validation, security, database operations, and health check patterns"
applyTo: "**/apps/api/**/*,**/apps/worker/**/*,**/apps/game-server/**/*"
---

# Backend Service Instructions

**Version:** 2.0.0 | **Last Updated:** 2025-11-05

## API Design

Follow RESTful principles:

- Use HTTP methods correctly (GET, POST, PUT, PATCH, DELETE)
- Return appropriate status codes (200, 201, 400, 401, 403, 404, 500)
- Version APIs (`/api/v1/users`)
- Use plural nouns for resources (`/users`, `/orders`)
- Support pagination, filtering, sorting

## Request Validation

Validate all inputs at the boundary:

```typescript
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().positive().optional(),
});

app.post("/users", async (req, res) => {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await userService.create(data);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
```

## Error Handling

Use structured error responses:

```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Usage
throw new AppError(404, "USER_NOT_FOUND", "User with ID 123 not found");

// Error handler middleware
app.use((err: Error, req, res, next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  } else {
    logger.error("Unhandled error", { err, req });
    res.status(500).json({ error: "Internal server error" });
  }
});
```

## Security

Apply defense in depth:

- Rate limiting on all endpoints
- Input sanitization and validation
- SQL injection prevention (use parameterized queries)
- CSRF protection for state-changing operations
- Content Security Policy headers
- Helmet middleware for security headers

```typescript
import helmet from "helmet";
import rateLimit from "express-rate-limit";

app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP",
  })
);
```

## Authentication & Authorization

```typescript
// JWT middleware
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const payload = await verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Role-based authorization
const authorize = (...roles: string[]) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

// Usage
app.get("/admin/users", authenticate, authorize("admin"), getUsers);
```

## Database Operations

Use repositories pattern:

```typescript
class UserRepository {
  async findById(id: string): Promise<User | null> {
    return db
      .query("SELECT * FROM users WHERE id = $1", [id])
      .then((rows) => rows[0] || null);
  }

  async create(data: CreateUserData): Promise<User> {
    return db
      .query("INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *", [
        data.email,
        data.name,
      ])
      .then((rows) => rows[0]);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const fields = Object.keys(data)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(", ");

    return db
      .query(`UPDATE users SET ${fields} WHERE id = $1 RETURNING *`, [
        id,
        ...Object.values(data),
      ])
      .then((rows) => rows[0]);
  }
}
```

## Logging

Use structured logging:

```typescript
import { logger } from "./logger";

// Include context
logger.info("User created", {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});

// Log errors with stack traces
logger.error("Failed to process payment", {
  error: err.message,
  stack: err.stack,
  orderId: order.id,
  amount: order.amount,
});
```

## Background Jobs

Use queue-based processing:

```typescript
import { Queue } from "bullmq";

const emailQueue = new Queue("email", {
  connection: redisConnection,
});

// Add job
await emailQueue.add("welcome-email", {
  userId: user.id,
  email: user.email,
});

// Process job
const worker = new Worker(
  "email",
  async (job) => {
    const { userId, email } = job.data;
    await sendWelcomeEmail(email);
    logger.info("Welcome email sent", { userId, email });
  },
  { connection: redisConnection }
);
```

## Testing Backend Services

Test multiple layers:

```typescript
describe("UserService", () => {
  it("should create user with hashed password", async () => {
    const userData = { email: "test@example.com", password: "secret" };
    const user = await userService.create(userData);

    expect(user.password).not.toBe("secret");
    expect(await bcrypt.compare("secret", user.password)).toBe(true);
  });

  it("should reject duplicate email", async () => {
    await userService.create({ email: "test@example.com", password: "pass" });

    await expect(
      userService.create({ email: "test@example.com", password: "pass" })
    ).rejects.toThrow("Email already exists");
  });
});

describe("API Integration", () => {
  it("should return 400 for invalid email", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .send({ email: "invalid", password: "test123" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });
});
```

## Performance

- Use connection pooling for databases
- Implement caching (Redis)
- Add database indexes for queried fields
- Use `SELECT` specific columns, not `*`
- Paginate large result sets
- Profile slow queries

## Health Checks

Provide status endpoints:

```typescript
app.get("/health", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
    },
  };

  const isHealthy = Object.values(health.checks).every((c) => c === "ok");
  res.status(isHealthy ? 200 : 503).json(health);
});
```

## Documentation

Generate OpenAPI/Swagger documentation:

```typescript
/**
 * @openapi
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       201:
 *         description: User created successfully
 */
```
