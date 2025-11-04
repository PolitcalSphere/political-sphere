
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import usersRouter from '../../src/routes/users.js';
import { getDatabase, closeDatabase } from '../../src/index.js';

describe('Users Routes', () => {
  let app;

  beforeEach(() => {
    getDatabase();
    app = express();
    // Debugging middleware to capture raw request headers before body parsing
    // eslint-disable-next-line no-console
    app.use((req, res, next) => {
      console.debug('[test] incoming headers:', req.headers);
      next();
    });
    // Use text parser + manual JSON parse to avoid body-parser charset handling quirks in the test environment
    app.use(express.text({ type: '*/*' }));
    app.use((req, res, next) => {
      try {
        if (typeof req.body === 'string' && req.body.length > 0) {
          // eslint-disable-next-line no-param-reassign
          req.body = JSON.parse(req.body);
        }
        return next();
      } catch (err) {
        return next(err);
      }
    });
    app.use('/api', usersRouter);
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const timestamp = Date.now();
      // Capture full response for debugging (don't use .expect so we can log body on 415)
      const response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json; charset=utf-8')
        .send({
          username: `user${timestamp}`,
          email: `test-${timestamp}@example.com`,
        });

      // Debug output to inspect why a 415 is returned
      // eslint-disable-next-line no-console
      console.log('[test-debug] status:', response.status);
      // eslint-disable-next-line no-console
      console.log('[test-debug] headers:', response.headers);
      // eslint-disable-next-line no-console
      console.log('[test-debug] body:', response.body);
      // eslint-disable-next-line no-console
      console.log('[test-debug] text:', response.text);

      assert.strictEqual(response.status, 201, `Expected 201 but got ${response.status}`);
      assert(response.body.id);
      assert.strictEqual(response.body.username, `user${timestamp}`);
      assert.strictEqual(response.body.email, `test-${timestamp}@example.com`);
      assert(response.body.createdAt);
      assert(response.body.updatedAt);
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          username: '',
          email: 'invalid-email',
        })
        .expect(400);

      assert(response.body.error);
    });

    it('should return 400 for duplicate username', async () => {
      const timestamp = Date.now();
      // Create first user
      await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          username: `user${timestamp}`,
          email: `test-${timestamp}@example.com`,
        })
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          username: `user${timestamp}`,
          email: `test2-${timestamp}@example.com`,
        })
        .expect(400);

      assert(response.body.error);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by id', async () => {
      const timestamp = Date.now();
      const createResponse = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          username: `user${timestamp}`,
          email: `test-${timestamp}@example.com`,
        })
        .expect(201);

      const getResponse = await request(app)
        .get(`/api/users/${createResponse.body.id}`)
        .expect(200);

      assert.deepStrictEqual(getResponse.body, createResponse.body);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).get('/api/users/non-existent-id').expect(404);

      assert.strictEqual(response.body.error, 'User not found');
    });
  });
});
