import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { getLogger } from '@political-sphere/shared';

const logger = getLogger({ service: 'auth' });

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// In-memory user store (replace with database in production)
const users = new Map();
const refreshTokens = new Set();

// User roles
export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

// Password hashing
export async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// JWT token generation
export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function generateRefreshToken(user) {
  const token = jwt.sign(
    {
      userId: user.id,
      type: 'refresh'
    },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );

  refreshTokens.add(token);
  return token;
}

// Token verification
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.warn('Invalid access token', { error: error.message });
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    if (!refreshTokens.has(token)) {
      logger.warn('Refresh token not found in store');
      return null;
    }
    return decoded;
  } catch (error) {
    logger.warn('Invalid refresh token', { error: error.message });
    return null;
  }
}

// User management
export async function createUser(email, password, role = ROLES.VIEWER) {
  if (users.has(email)) {
    throw new Error('User already exists');
  }

  const hashedPassword = await hashPassword(password);
  const user = {
    id: crypto.randomUUID(),
    email,
    passwordHash: hashedPassword,
    role,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    isActive: true
  };

  users.set(email, user);
  logger.info('User created', { userId: user.id, email, role });
  return { id: user.id, email, role };
}

export async function authenticateUser(email, password) {
  const user = users.get(email);
  if (!user || !user.isActive) {
    logger.warn('Authentication failed - user not found or inactive', { email });
    return null;
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    logger.warn('Authentication failed - invalid password', { email });
    return null;
  }

  // Update last login
  user.lastLogin = new Date().toISOString();
  users.set(email, user);

  logger.info('User authenticated', { userId: user.id, email });
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    lastLogin: user.lastLogin
  };
}

export function getUserById(id) {
  for (const user of users.values()) {
    if (user.id === id) {
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive
      };
    }
  }
  return null;
}

export function revokeRefreshToken(token) {
  refreshTokens.delete(token);
  logger.info('Refresh token revoked');
}

export function revokeAllUserTokens(userId) {
  // In a real implementation, you'd track tokens per user
  // For now, we'll clear all refresh tokens (not ideal but works for demo)
  refreshTokens.clear();
  logger.info('All refresh tokens revoked for user', { userId });
}

// Authorization middleware
export function requireAuth(requiredRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid authorization header', {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      logger.warn('Invalid access token', {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check role requirements
    if (requiredRoles.length > 0 && !requiredRoles.includes(decoded.role)) {
      logger.warn('Insufficient permissions', {
        userId: decoded.userId,
        requiredRoles,
        userRole: decoded.role
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.user = decoded;
    next();
  };
}

// Role-based authorization helpers
export function requireRole(role) {
  return requireAuth([role]);
}

export function requireAdmin(req, res, next) {
  return requireAuth([ROLES.ADMIN])(req, res, next);
}

export function requireEditor(req, res, next) {
  return requireAuth([ROLES.EDITOR, ROLES.ADMIN])(req, res, next);
}

// Password reset functionality
export async function initiatePasswordReset(email) {
  const user = users.get(email);
  if (!user) {
    // Don't reveal if user exists
    logger.info('Password reset requested for unknown email', { email });
    return true;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  user.passwordResetToken = resetToken;
  user.passwordResetExpires = resetExpires;
  users.set(email, user);

  // In production, send email with reset link
  logger.info('Password reset token generated', { userId: user.id, email });
  return resetToken; // Return for testing - don't do this in production
}

export async function resetPassword(token, newPassword) {
  let user = null;
  for (const u of users.values()) {
    if (u.passwordResetToken === token && u.passwordResetExpires > new Date()) {
      user = u;
      break;
    }
  }

  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  users.set(user.email, user);

  logger.info('Password reset successful', { userId: user.id });
  return true;
}

// Session management
const activeSessions = new Map();

export function createSession(userId, userAgent, ip) {
  const sessionId = crypto.randomUUID();
  const session = {
    id: sessionId,
    userId,
    userAgent,
    ip,
    createdAt: new Date(),
    lastActivity: new Date()
  };

  activeSessions.set(sessionId, session);
  return sessionId;
}

export function getSession(sessionId) {
  return activeSessions.get(sessionId) || null;
}

export function updateSessionActivity(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastActivity = new Date();
    activeSessions.set(sessionId, session);
  }
}

export function destroySession(sessionId) {
  activeSessions.delete(sessionId);
  logger.info('Session destroyed', { sessionId });
}

export function cleanupExpiredSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
  const now = new Date();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > maxAge) {
      activeSessions.delete(sessionId);
    }
  }
}

// Clean up expired sessions every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// Export for testing
export { users, refreshTokens, activeSessions };
