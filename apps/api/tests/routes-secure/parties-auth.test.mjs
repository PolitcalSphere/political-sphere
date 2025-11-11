import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeDatabase, getDatabase } from '../../src/modules/stores/index.ts';
import authRouter from '../../src/routes/auth.js';
import partiesRouter from '../../src/routes/parties.js';

async function registerAndLogin(app, email = `party+${Date.now()}@example.com`) {
  const username = `party_user_${Date.now()}`;
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

describe('parties routes (auth enforced)', () => {
  let app;
  const prev = process.env.FORCE_AUTH;

  beforeEach(() => {
    process.env.FORCE_AUTH = '1';
    getDatabase();

    app = express();
    app.use(express.json());
    app.use('/', authRouter);
    app.use('/', partiesRouter);
  });

  afterEach(() => {
    process.env.FORCE_AUTH = prev;
    closeDatabase();
  });

  it('creates a party with valid token (POST /parties)', async () => {
    const { token } = await registerAndLogin(app);

    const res = await request(app)
      .post('/parties')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Auth Party', description: 'Secure party', color: '#112233' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe('Auth Party');
  });
});
