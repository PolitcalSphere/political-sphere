import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the domain UserService used by routes/users.js
vi.mock('../domain', () => {
  return {
    UserService: class {
      async createUser(input) {
        return { id: 'u-created', ...input, createdAt: new Date() };
      }
      async getUserById(id) {
        if (id === 'exists') return { id, username: 'exists', email: 'e@example.com' };
        return null;
      }
    },
  };
});

import usersRouter from '../routes/users.js';

describe('users routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', usersRouter);
  });

  it('creates a user (POST /users)', async () => {
    const res = await request(app)
      .post('/users')
      .send({ username: 'alice', email: 'alice@example.com' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.username).toBe('alice');
  });

  it('returns 404 for missing user (GET /users/:id)', async () => {
    const res = await request(app).get('/users/missing');
    expect(res.status).toBe(404);
  });

  it('returns user when exists (GET /users/:id)', async () => {
    const res = await request(app).get('/users/exists');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'exists');
  });
});
