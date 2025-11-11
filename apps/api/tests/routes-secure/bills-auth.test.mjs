import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeDatabase, getDatabase } from '../../src/modules/stores/index.ts';
import authRouter from '../../src/routes/auth.js';
import billsRouter from '../../src/routes/bills.js';

// Helper to register + login and return { token, user }
async function registerAndLogin(app, email = `user+${Date.now()}@example.com`) {
  const username = `tester_${Date.now()}`;
  const password = 'password123';

  // Register
  const reg = await request(app)
    .post('/register')
    .send({ username, email, password })
    .set('Content-Type', 'application/json');
  expect(reg.status).toBe(201);

  // Login
  const login = await request(app)
    .post('/login')
    .send({ email, password })
    .set('Content-Type', 'application/json');
  expect(login.status).toBe(200);
  return { token: login.body.data.token, user: login.body.data.user };
}

describe('bills routes (auth enforced)', () => {
  let app;
  const prev = process.env.FORCE_AUTH;

  beforeEach(() => {
    // Enforce auth paths in test
    process.env.FORCE_AUTH = '1';
    getDatabase();

    app = express();
    app.use(express.json());
    app.use('/', authRouter);
    app.use('/', billsRouter);
  });

  afterEach(() => {
    process.env.FORCE_AUTH = prev;
    closeDatabase();
  });

  it('creates a bill with valid token (POST /bills)', async () => {
    const { token, user } = await registerAndLogin(app);

    const res = await request(app)
      .post('/bills')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Auth Bill', description: 'Bill via auth', proposerId: user.id })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Auth Bill');
  });
});
