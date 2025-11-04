import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../domain', () => {
  return {
    PartyService: class {
      async createParty(input) {
        return { id: 'p-created', ...input, createdAt: new Date() };
      }
      async getPartyById(id) {
        if (id === 'exists') return { id, name: 'exists', color: '#000' };
        return null;
      }
      async getAllParties() {
        return [{ id: 'p1', name: 'P1', color: '#111' }];
      }
    },
  };
});

import partiesRouter from '../routes/parties.js';

describe('parties routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', partiesRouter);
  });

  it('creates a party (POST /parties)', async () => {
    const res = await request(app)
      .post('/parties')
      .send({ name: 'Greens', color: '#00ff00', description: 'green' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Greens');
  });

  it('GET /parties/:id returns 404 for missing', async () => {
    const res = await request(app).get('/parties/missing');
    expect(res.status).toBe(404);
  });

  it('GET /parties returns list', async () => {
    const res = await request(app).get('/parties');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
