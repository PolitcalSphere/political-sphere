import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { authenticate, requireRole } from './middleware/auth.js';
import { csrfProtection, csrfTokenMiddleware } from './middleware/csrf.js';
import requestId from './middleware/request-id.js';
import ageVerificationRoutes from './routes/ageVerification.js';
import authRoutes from './routes/auth.js';
import billRoutes from './routes/bills.js';
import complianceRoutes from './routes/compliance.js';
import moderationRoutes from './routes/moderation.js';
import newsRoutes from './routes/news.js';
import partyRoutes from './routes/parties.js';
import userRoutes from './routes/users.js';
import voteRoutes from './routes/votes.js';
import { sanitizeRequestForLog } from './utils/log-sanitizer.mjs';

import { getDatabase } from './index.js';

const app = express();
const logger = console;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// Configure CORS with secure origin allowlist
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite dev server
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Sanitize origin header before logging to prevent log injection
        const sanitizedOrigin = origin
          ? String(origin)
              .replace(/[\r\n\t]/g, ' ')
              .substring(0, 200)
          : 'unknown';
        logger.warn(`CORS: Blocked request from unauthorized origin: ${sanitizedOrigin}`);
        callback(new Error(`Origin ${sanitizedOrigin} not allowed by CORS policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  })
);

app.use(requestId);
app.use(compression());
app.use(cookieParser()); // Required for CSRF double-submit cookie pattern

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CSRF protection: apply after body parsers, before authenticated routes
// Uses modern csrf-csrf package with double-submit cookie pattern
app.use(csrfTokenMiddleware);
app.use(csrfProtection);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});
app.use(limiter);

app.use((req, res, next) => {
  const start = Date.now();
  // Security: Sanitize request data before logging to prevent log injection
  const sanitizedReq = sanitizeRequestForLog(req);
  logger.log('Request received', {
    requestId: sanitizedReq.requestId,
    method: sanitizedReq.method,
    url: sanitizedReq.url,
    ip: sanitizedReq.ip,
    userAgent: sanitizedReq.userAgent,
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.log('Request completed', {
      requestId: sanitizedReq.requestId,
      method: sanitizedReq.method,
      url: sanitizedReq.url,
      status: res.statusCode,
      duration,
    });
  });

  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'api',
    requestId: req.requestId,
  });
});

app.get('/ready', (req, res) => {
  // Check database connectivity
  try {
    const db = getDatabase();
    if (db?.open) {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        service: 'api',
        database: 'connected',
        requestId: req.requestId,
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        service: 'api',
        database: 'disconnected',
        requestId: req.requestId,
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      service: 'api',
      database: 'error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database check failed',
      requestId: req.requestId,
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/parties', authenticate, partyRoutes);
app.use('/api/bills', authenticate, billRoutes);
app.use('/api/votes', authenticate, voteRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/compliance', authenticate, requireRole('admin'), complianceRoutes);
app.use('/api/age-verification', authenticate, ageVerificationRoutes);
app.use('/api', newsRoutes);
app.use('/', newsRoutes);

app.use((err, req, res, _next) => {
  console.error('Unhandled error', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

app.use((req, res) => {
  console.warn('Route not found', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
  });

  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'The requested resource was not found',
  });
});

const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing server...');

  const db = getDatabase();
  if (db) {
    db.close();
  }

  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('API server started', {
    host: HOST,
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
});

export default app;
