import express from 'express';
import request from 'supertest';
import usersRouter from '../apps/api/src/routes/users.js';
import { getDatabase, closeDatabase } from '../apps/api/src/stores/index.js';

const app = express();
app.use((req, res, next) => {
  console.log('[debug-script] incoming headers:', req.headers);
  next();
});
app.use(express.json({ type: '*/*' }));
app.use('/api', usersRouter);

(async () => {
  getDatabase();
  try {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'testuser', email: 'test@example.com' });

    console.log('[debug-script] status:', res.status);
    console.log('[debug-script] headers:', res.headers);
    console.log('[debug-script] body:', res.body);
    console.log('[debug-script] text:', res.text);
  } catch (err) {
    console.error('[debug-script] error', err);
  } finally {
    closeDatabase();
  }
})();
