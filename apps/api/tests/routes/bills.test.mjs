
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import billsRouter from '../../src/routes/bills.js';
import usersRouter from '../../src/routes/users.js';
import { getDatabase, closeDatabase } from '../../src/index.js';

describe('Bills Routes', () => {
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
    app.use('/api', billsRouter);
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('POST /api/bills', () => {
    it('should create a new bill', async () => {
      const timestamp = Date.now();
      // First create a user
      const userResponse = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          username: `user${timestamp}`,
          email: `test-${timestamp}@example.com`,
        })
        .expect(201);

      const userId = userResponse.body.data.id;

      const response = await request(app)
        .post('/api/bills')
        .set('Content-Type', 'application/json')
        .send({
          title: `Test Bill ${timestamp}`,
          description: 'A test bill description',
          proposerId: userId,
        })
        .expect(201);

      assert(response.body.id);
      assert.strictEqual(response.body.title, `Test Bill ${timestamp}`);
      assert.strictEqual(response.body.description, 'A test bill description');
      assert.strictEqual(response.body.proposerId, userId);
      assert.strictEqual(response.body.status, 'proposed');
      assert(response.body.createdAt);
      assert(response.body.updatedAt);
    });

    it('should return 400 for non-existent proposer', async () => {
      const response = await request(app)
        .post('/api/bills')
        .set('Content-Type', 'application/json')
        .send({
          title: 'Test Bill',
          description: 'A test bill description',
          proposerId: 'non-existent-id',
        })
        .expect(400);

      assert(response.body.error);
    });
  });

  describe('GET /api/bills/:id', () => {
    it('should return bill by id', async () => {
      const timestamp = Date.now();
      // Create user and bill
      const userResponse = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          username: `user${timestamp}`,
          email: `test-${timestamp}@example.com`,
        })
        .expect(201);

      const userId = userResponse.body.data.id;

      const billResponse = await request(app)
        .post('/api/bills')
        .set('Content-Type', 'application/json')
        .send({
          title: `Test Bill ${timestamp}`,
          description: 'A test bill description',
          proposerId: userId,
        })
        .expect(201);

      const getResponse = await request(app).get(`/api/bills/${billResponse.body.id}`).expect(200);

      assert.deepStrictEqual(getResponse.body, billResponse.body);
    });

    it('should return 404 for non-existent bill', async () => {
      const response = await request(app).get('/api/bills/non-existent-id').expect(404);

      assert.strictEqual(response.body.error, 'Bill not found');
    });
  });

  describe('GET /api/bills', () => {
    it('should return all bills', async () => {
      // Create user and bills
      const userResponse = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          username: 'testuser',
          email: 'test@example.com',
        })
        .expect(201);

      const userId = userResponse.body.data.id;

      const bill1Response = await request(app)
        .post('/api/bills')
        .set('Content-Type', 'application/json')
        .send({
          title: 'Bill 1',
          description: 'First bill',
          proposerId: userId,
        })
        .expect(201);

      const bill2Response = await request(app)
        .post('/api/bills')
        .set('Content-Type', 'application/json')
        .send({
          title: 'Bill 2',
          description: 'Second bill',
          proposerId: userId,
        })
        .expect(201);

      const getResponse = await request(app).get('/api/bills').expect(200);

      assert(Array.isArray(getResponse.body));
      assert(getResponse.body.length >= 2);
      assert(getResponse.body.some((b) => b.id === bill1Response.body.id));
      assert(getResponse.body.some((b) => b.id === bill2Response.body.id));
    });
  });
});
