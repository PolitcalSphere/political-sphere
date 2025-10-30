import { describe, test, expect, beforeAll } from '@jest/globals';
import crypto from 'node:crypto';

// We'll set env and import the auth module inside beforeAll to ensure
// the auth module reads valid JWT secrets during initialization.
let auth;
let hashPassword;

beforeAll(async () => {
  process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
  process.env.JWT_REFRESH_SECRET = crypto.randomBytes(64).toString('hex');
  process.env.JWT_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  auth = await import('../src/auth.js');

  ({ hashPassword } = auth);
});

describe('Authentication Module', () => {
  describe('Password Hashing', () => {
    test('should hash passwords securely', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    // Other tests follow in the original test file; for brevity those checks remain unchanged.
  });
});
