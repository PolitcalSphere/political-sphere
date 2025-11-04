
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import votesRouter from '../../src/routes/votes.js';
import billsRouter from '../../src/routes/bills.js';
import usersRouter from '../../src/routes/users.js';
import { getDatabase, closeDatabase } from '../../src/index.js';

describe('Votes Routes', () => {
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
    app.use('/api', votesRouter);
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('POST /api/votes', () => {
    it('should create a new vote', async () => {
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

      const billResponse = await request(app)
        .post('/api/bills')
        .set('Content-Type', 'application/json')
        .send({
          title: `Test Bill ${timestamp}`,
          description: 'A test bill',
          proposerId: userResponse.body.id,
        })
        .expect(201);

      const response = await request(app)
        .post('/api/votes')
        .set('Content-Type', 'application/json')
        .send({
          billId: billResponse.body.id,
          userId: userResponse.body.id,
          vote: 'aye',
        })
        .expect(201);

      assert(response.body.id);
      assert.strictEqual(response.body.billId, billResponse.body.id);
      assert.strictEqual(response.body.userId, userResponse.body.id);
      assert.strictEqual(response.body.vote, 'aye');
      assert(response.body.createdAt);
    });

    it('should return 400 for duplicate vote', async () => {
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

      const billResponse = await request(app)
        .post('/api/bills')
        .set('Content-Type', 'application/json')
        .send({
          title: `Test Bill ${timestamp}`,
          description: 'A test bill',
          proposerId: userResponse.body.id,
        })
        .expect(201);

      // Cast first vote
      await request(app)
        .post('/api/votes')
        .set('Content-Type', 'application/json')
        .send({
          billId: billResponse.body.id,
          userId: userResponse.body.id,
          vote: 'aye',
        })
        .expect(201);

      // Try to vote again
      const response = await request(app)
        .post('/api/votes')
        .set('Content-Type', 'application/json')
        .send({
          billId: billResponse.body.id,
          userId: userResponse.body.id,
          vote: 'nay',
        })
        .expect(400);

      assert(response.body.error);
    });
  });

  describe('GET /api/bills/:id/votes', () => {
    it('should return votes for a bill', async () => {
      const timestamp = Date.now();
      // Create users and bill
      const user1Response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          username: `user1-${timestamp}`,
          email: `user1-${timestamp}@example.com`,
        })
        .expect(201);

      const user2Response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          username: `user2-${timestamp}`,
          email: `user2-${timestamp}@example.com`,
        })
        .expect(201);

      const billResponse = await request(app)
        .post('/api/bills')
        .set('Content-Type', 'application/json')
        .send({
          title: `Test Bill ${timestamp}`,
          description: 'A test bill',
          proposerId: user1Response.body.id,
        })
        .expect(201);

      // Cast votes
      const vote1Response = await request(app)
        .post('/api/votes')
        .set('Content-Type', 'application/json')
        .send({
          billId: billResponse.body.id,
          userId: user1Response.body.id,
          vote: 'aye',
        })
        .expect(201);

      const vote2Response = await request(app)
        .post('/api/votes')
        .set('Content-Type', 'application/json')
        .send({
          billId: billResponse.body.id,
          userId: user2Response.body.id,
          vote: 'nay',
        })
        .expect(201);

      const getResponse = await request(app)
        .get(`/api/bills/${billResponse.body.id}/votes`)
        .expect(200);

      assert(Array.isArray(getResponse.body));
      assert.strictEqual(getResponse.body.length, 2);
      assert(getResponse.body.some((v) => v.id === vote1Response.body.id));
      assert(getResponse.body.some((v) => v.id === vote2Response.body.id));
    });
  });

  describe('GET /api/bills/:id/vote-counts', () => {
    it('should return vote counts for a bill', async () => {
      const timestamp = Date.now();
      // Create users and bill
      const user1Response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          username: `user1-${timestamp}`,
          email: `user1-${timestamp}@example.com`,
        })
        .expect(201);

      const user2Response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          username: `user2-${timestamp}`,
          email: `user2-${timestamp}@example.com`,
        })
        .expect(201);

      const user3Response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          username: `user3-${timestamp}`,
          email: `user3-${timestamp}@example.com`,
        })
        .expect(201);

      const billResponse = await request(app)
        .post('/api/bills')
        .set('Content-Type', 'application/json')
        .send({
          title: `Test Bill ${timestamp}`,
          description: 'A test bill',
          proposerId: user1Response.body.id,
        })
        .expect(201);

      // Cast votes
      await request(app)
        .post('/api/votes')
        .set('Content-Type', 'application/json')
        .send({
          billId: billResponse.body.id,
          userId: user1Response.body.id,
          vote: 'aye',
        })
        .expect(201);

      await request(app)
        .post('/api/votes')
        .set('Content-Type', 'application/json')
        .send({
          billId: billResponse.body.id,
          userId: user2Response.body.id,
          vote: 'aye',
        })
        .expect(201);

      await request(app)
        .post('/api/votes')
        .set('Content-Type', 'application/json')
        .send({
          billId: billResponse.body.id,
          userId: user3Response.body.id,
          vote: 'nay',
        })
        .expect(201);

      const getResponse = await request(app)
        .get(`/api/bills/${billResponse.body.id}/vote-counts`)
        .expect(200);

      assert.strictEqual(getResponse.body.aye, 2);
      assert.strictEqual(getResponse.body.nay, 1);
      assert.strictEqual(getResponse.body.abstain, 0);
    });
  });
});
