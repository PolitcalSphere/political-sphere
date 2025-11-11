import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeDatabase, getDatabase } from '../../src/modules/stores/index.ts';
import authRouter from '../../src/routes/auth.js';
import billsRouter from '../../src/routes/bills.js';
import votesRouter from '../../src/routes/votes.js';

async function registerAndLogin(app, email = `vote+${Date.now()}@example.com`) {
  const username = `voter_${Date.now()}`;
  const password = 'password123';
  await request(app)
    .post('/register')
    .send({ username, email, password })
    .set('Content-Type', 'application/json');
  const login = await request(app)
    .post('/login')
    .send({ email, password })
    .set('Content-Type', 'application/json');
  return { token: login.body.data.token, user: login.body.data.user };
}

describe('votes routes (auth enforced)', () => {
  let app;
  const prev = process.env.FORCE_AUTH;

  beforeEach(() => {
    process.env.FORCE_AUTH = '1';
    getDatabase();

    app = express();
    app.use(express.json());
    app.use('/', authRouter);
    app.use('/', billsRouter);
    app.use('/', votesRouter);
  });

  afterEach(() => {
    process.env.FORCE_AUTH = prev;
    closeDatabase();
  });

  it('creates a vote with valid token (POST /votes)', async () => {
    const { token, user } = await registerAndLogin(app);

    // First create a bill to vote on
    const billRes = await request(app)
      .post('/bills')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Vote Bill', description: 'Bill for voting', proposerId: user.id })
      .set('Content-Type', 'application/json');
    expect(billRes.status).toBe(201);

    const voteRes = await request(app)
      .post('/votes')
      .set('Authorization', `Bearer ${token}`)
      .send({ billId: billRes.body.id, userId: user.id, vote: 'aye' })
      .set('Content-Type', 'application/json');

    expect(voteRes.status).toBe(201);
    expect(voteRes.body).toHaveProperty('id');
    expect(voteRes.body.vote).toBe('aye');
  });
});
