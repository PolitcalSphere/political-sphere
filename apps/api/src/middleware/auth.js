/**
 * Authentication and Authorization Middleware
 * Implements JWT-based authentication with role-based access control
 */

const jwt = require('jsonwebtoken');
const logger = require('../logger');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * JWT Authentication Middleware
 * Validates JWT token and attaches user to request
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid access token'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      });
    }

    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    logger.debug('User authenticated', { userId: req.user.id, path: req.path });
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Access token has expired'
      });
    }

    logger.error('Authentication failed', { error: error.message, path: req.path });
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Invalid authentication credentials'
    });
  }
}

/**
 * Role-based Authorization Middleware Factory
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {Function} Middleware function
 */
function requireRole(requiredRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    if (!roles.includes(userRole)) {
      logger.warn('Access denied', {
        userId: req.user.id,
        userRole,
        requiredRoles: roles,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
}

/**
 * Optional Authentication Middleware
 * Attaches user if token is present, but doesn't require it
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.accessToken;

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.type === 'access') {
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        };
      }
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }

  next();
}

/**
 * Admin-only Authorization Middleware
 */
function requireAdmin(req, res, next) {
  return requireRole('ADMIN')(req, res, next);
}

/**
 * Moderator Authorization Middleware (Admin or Moderator)
 */
function requireModerator(req, res, next) {
  return requireRole(['ADMIN', 'MODERATOR'])(req, res, next);
}

/**
 * Refresh Token Authentication Middleware
 * For token refresh endpoints
 */
function authenticateRefreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required',
        message: 'Please provide a refresh token'
      });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid'
      });
    }

    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    logger.error('Refresh token authentication failed', { error: error.message });
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
      message: 'Refresh token verification failed'
    });
  }
}

export {
  authenticate,
  requireRole,
  optionalAuth,
  requireAdmin,
  requireModerator,
  authenticateRefreshToken
};