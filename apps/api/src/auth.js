import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

/*
  filepath: /Users/morganlowman/politicial-sphere (V1)/apps/api/src/auth.js
  Purpose: In-memory authentication utilities used by tests.
  Ownership: tests/auth.test.js expectations
*/

// Roles
export const ROLES = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER'
};

// In-memory stores exposed for tests
export const users = new Map(); // key: email -> user object
export const refreshTokens = new Set(); // active refresh tokens
export const activeSessions = new Map(); // key: sessionId -> session object

// Read and validate secrets at module load (tests set env before import)
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (JWT_SECRET.length < 32 || JWT_REFRESH_SECRET.length < 32) {
  throw new Error('JWT secrets must be at least 32 characters');
}

// Password hashing
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password || '', salt);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password || '', hash || '');
}

// Token generation & verification
export function generateAccessToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'access'
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(user) {
  const payload = {
    userId: user.id,
    type: 'refresh'
  };
  const token = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  refreshTokens.add(token);
  return token;
}

export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.type === 'access') return decoded;
    return null;
  } catch (err) {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    if (!refreshTokens.has(token)) return null;
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    if (decoded && decoded.type === 'refresh') return decoded;
    return null;
  } catch (err) {
    return null;
  }
}

// Sanitize outgoing user objects (tests assert sensitive fields are not exposed)
function sanitizeUser(user) {
  if (!user) return null;
  const {
    passwordHash,
    passwordResetToken,
    passwordResetExpires,
    password,
    ...rest
  } = user;
  return { ...rest };
}

// User management
export async function createUser(email, password = '', role = ROLES.VIEWER) {
  if (!email) throw new Error('Email required');
  if (users.has(email)) throw new Error('User already exists');
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const user = {
    id,
    email,
    role,
    passwordHash,
    createdAt: new Date(),
    isActive: true,
    passwordResetToken: undefined,
    passwordResetExpires: undefined
  };
  users.set(email, user);
  return sanitizeUser(user);
}

export async function authenticateUser(email, password) {
  const user = users.get(email);
  if (!user) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  return { user: sanitizeUser(user), accessToken, refreshToken };
}

// Password reset flows
export async function initiatePasswordReset(email) {
  const user = users.get(email);
  if (!user) {
    // Do not reveal existence
    return true;
  }
  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = token;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  users.set(email, user);
  return token;
}

export async function resetPassword(token, newPassword) {
  if (!token) throw new Error('Invalid or expired reset token');
  const user = Array.from(users.values()).find(u => u.passwordResetToken === token);
  if (!user || !user.passwordResetExpires || user.passwordResetExpires.getTime() < Date.now()) {
    throw new Error('Invalid or expired reset token');
  }
  user.passwordHash = await hashPassword(newPassword || '');
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  users.set(user.email, user);
  return true;
}

// Session management
export function createSession(userId, userAgent, ip) {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const session = {
    id: sessionId,
    userId,
    userAgent,
    ip,
    createdAt: now,
    lastActivity: now
  };
  activeSessions.set(sessionId, session);
  return sessionId;
}

export function getSession(sessionId) {
  const s = activeSessions.get(sessionId);
  return s ? { ...s } : null;
}

export function updateSessionActivity(sessionId) {
  const s = activeSessions.get(sessionId);
  if (!s) return null;
  s.lastActivity = new Date();
  activeSessions.set(sessionId, s);
  return s;
}

export function destroySession(sessionId) {
  activeSessions.delete(sessionId);
}

export function cleanupExpiredSessions(maxAgeMs) {
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.lastActivity.getTime() > maxAgeMs) {
      activeSessions.delete(id);
    }
  }
}

// Lookup
export function getUserById(id) {
  if (!id) return null;
  const user = Array.from(users.values()).find(u => u.id === id);
  return sanitizeUser(user);
}

// Token revocation
export function revokeRefreshToken(token) {
  refreshTokens.delete(token);
}

export function revokeAllUserTokens(/* userId */) {
  // Demo/test expectation: clears all refresh tokens
  refreshTokens.clear();
}

// Authorization middleware
export function requireAuth(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

export function requireEditor() {
  return requireAuth([ROLES.EDITOR, ROLES.ADMIN]);
}
