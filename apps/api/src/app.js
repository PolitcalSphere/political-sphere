/**
 * Main API Server Application
 * Sets up Express server with all routes and middleware
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { getLogger } from '@political-sphere/shared';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import partyRoutes from './routes/parties.js';
import billRoutes from './routes/bills.js';
import voteRoutes from './routes/votes.js';
import moderationRoutes from './routes/moderation.js';
import complianceRoutes from './routes/compliance.js';
import ageVerificationRoutes from './routes/ageVerification.js';

// Import middleware
import { authenticate, requireRole } from './middleware/auth.js';

// Import services
import { getDatabase } from './index.js';

const app = express();
const logger = getLogger({
  service: 'api',
  level: process.env.LOG_LEVEL || 'info',
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
    });
  });

  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'api',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/parties', authenticate, partyRoutes);
app.use('/api/bills', authenticate, billRoutes);
app.use('/api/votes', authenticate, voteRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/compliance', authenticate, requireRole('admin'), complianceRoutes);
app.use('/api/age-verification', authenticate, ageVerificationRoutes);

// Error handling middleware
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: _req.url,
    method: _req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
  });

  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'The requested resource was not found',
  });
});

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server...');

  // Close database connection
  const db = getDatabase();
  if (db) {
    db.close();
  }

  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  logger.info('API server started', {
    host: HOST,
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
});

export default app;