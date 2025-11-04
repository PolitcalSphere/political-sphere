/**
 * Authentication Routes
 * Handles user registration, login, token refresh, and logout
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticate, authenticateRefreshToken } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// In-memory user store (replace with database in production)
const users = new Map();
const refreshTokens = new Set();

// Rate limiting for auth endpoints
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for auth
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, role = 'VIEWER' } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if user exists
    if (users.has(email)) {
      return res.status(409).json({
        success: false,
        error: 'User exists',
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = crypto.randomUUID();
    const user = {
      id: userId,
      email,
      passwordHash,
      role: role.toUpperCase(),
      createdAt: new Date().toISOString(),
      isActive: true
    };

    users.set(email, user);

    logger.audit('User registered', { userId, email, role: user.role });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          email,
          role: user.role,
          createdAt: user.createdAt
        }
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    logger.error('Registration failed', { error: error.message, email: req.body.email });
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: 'Unable to register user at this time'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = users.get(email);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    // Store refresh token
    refreshTokens.add(refreshToken);

    logger.audit('User logged in', { userId: user.id, email });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: JWT_EXPIRES_IN
        }
      }
    });
  } catch (error) {
    logger.error('Login failed', { error: error.message, email: req.body.email });
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: 'Unable to authenticate user at this time'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', authenticateRefreshToken, async (req, res) => {
  try {
    const user = users.get(req.user.email);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'User not found or inactive'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.audit('Token refreshed', { userId: user.id });

    res.json({
      success: true,
      data: {
        accessToken,
        expiresIn: JWT_EXPIRES_IN
      }
    });
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: 'Unable to refresh token at this time'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user by invalidating refresh token
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Remove refresh token from store
    if (refreshToken) {
      refreshTokens.delete(refreshToken);
    }

    logger.audit('User logged out', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout failed', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: 'Unable to logout at this time'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = users.get(req.user.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    logger.error('Profile fetch failed', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Profile fetch failed',
      message: 'Unable to retrieve user profile'
    });
  }
});

/**
 * POST /api/auth/service-login
 * Service account authentication (for internal services)
 */
router.post('/service-login', async (req, res) => {
  try {
    const { serviceId, secret } = req.body;

    // Validate service credentials (in production, use proper service auth)
    if (serviceId !== process.env.GAME_SERVER_SERVICE_ID ||
        secret !== process.env.GAME_SERVER_SECRET) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid service credentials'
      });
    }

    // Generate service token
    const accessToken = jwt.sign(
      {
        serviceId,
        type: 'service',
        permissions: ['read', 'write']
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    logger.audit('Service authenticated', { serviceId });

    res.json({
      success: true,
      data: {
        token: accessToken,
        expiresIn: '1h'
      }
    });
  } catch (error) {
    logger.error('Service login failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Service login failed',
      message: 'Unable to authenticate service'
    });
  }
});

module.exports = router;
