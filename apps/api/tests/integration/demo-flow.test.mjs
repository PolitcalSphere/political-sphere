
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import usersRouter from '../../src/routes/users.js';
import partiesRouter from '../../src/routes/parties.js';
import billsRouter from '../../src/routes/bills.js';
import votesRouter from '../../src/routes/votes.js';
import { getDatabase, closeDatabase } from '../../src/index.js';

describe('Demo Flow Integration Test', () => {
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
    app.use('/api', partiesRouter);
    app.use('/api', billsRouter);
    app.use('/api', votesRouter);
  });

  afterEach(() => {
    closeDatabase();
  });

  it('should complete the full demo flow: create user → propose bill → vote', async () => {
    const timestamp = Date.now();
    console.log('Starting demo flow integration test...');

    // Step 1: Create a user
    console.log('Step 1: Creating user...');
    const userResponse = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send({
        username: `alice${timestamp}`,
        email: `alice-${timestamp}@example.com`,
      })
      .expect(201);

    assert(userResponse.body.data.id);
    assert.strictEqual(userResponse.body.data.username, `alice${timestamp}`);
    assert.strictEqual(userResponse.body.data.email, `alice-${timestamp}@example.com`);
    console.log('✓ User created:', userResponse.body.data.username);

    // Step 2: Create a party
    console.log('Step 2: Creating party...');
    const partyResponse = await request(app)
      .post('/api/parties')
      .set('Content-Type', 'application/json')
      .send({
        name: `Progressive Party ${timestamp}`,
        description: 'A party focused on social progress and equality',
        color: '#FF6B6B',
      })
      .expect(201);

    assert(partyResponse.body.data.id);
    assert.strictEqual(partyResponse.body.data.name, `Progressive Party ${timestamp}`);
    console.log('✓ Party created:', partyResponse.body.data.name);

    // Step 3: Propose a bill
    console.log('Step 3: Proposing bill...');
    const billResponse = await request(app)
      .post('/api/bills')
      .set('Content-Type', 'application/json')
      .send({
        title: `Environmental Protection Act ${timestamp}`,
        description: 'A comprehensive bill to protect our environment and reduce carbon emissions',
        proposerId: userResponse.body.data.id,
      })
      .expect(201);

    assert(billResponse.body.id);
    assert.strictEqual(billResponse.body.title, `Environmental Protection Act ${timestamp}`);
    assert.strictEqual(billResponse.body.proposerId, userResponse.body.data.id);
    assert.strictEqual(billResponse.body.status, 'proposed');
    console.log('✓ Bill proposed:', billResponse.body.title);

    // Step 4: Create another user to vote
    console.log('Step 4: Creating second user for voting...');
    const user2Response = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send({
        username: `bob${timestamp}`,
        email: `bob-${timestamp}@example.com`,
      })
      .expect(201);

    console.log('✓ Second user created:', user2Response.body.data.username);

    // Step 5: Cast votes
    console.log('Step 5: Casting votes...');
    const vote1Response = await request(app)
      .post('/api/votes')
      .set('Content-Type', 'application/json')
      .send({
        billId: billResponse.body.id,
        userId: userResponse.body.data.id,
        vote: 'aye',
      })
      .expect(201);

    assert(vote1Response.body.id);
    assert.strictEqual(vote1Response.body.vote, 'aye');
    console.log('✓ Vote cast by alice: aye');

    const vote2Response = await request(app)
      .post('/api/votes')
      .set('Content-Type', 'application/json')
      .send({
        billId: billResponse.body.id,
        userId: user2Response.body.data.id,
        vote: 'nay',
      })
      .expect(201);

    assert(vote2Response.body.id);
    assert.strictEqual(vote2Response.body.vote, 'nay');
    console.log('✓ Vote cast by bob: nay');

    // Step 6: Check vote counts
    console.log('Step 6: Checking vote counts...');
    const countsResponse = await request(app)
      .get(`/api/bills/${billResponse.body.id}/vote-counts`)
      .expect(200);

    assert.strictEqual(countsResponse.body.aye, 1);
    assert.strictEqual(countsResponse.body.nay, 1);
    assert.strictEqual(countsResponse.body.abstain, 0);
    console.log('✓ Vote counts verified: aye=1, nay=1, abstain=0');

    // Step 7: Verify bill details
    console.log('Step 7: Verifying bill details...');
    const billDetailsResponse = await request(app)
      .get(`/api/bills/${billResponse.body.id}`)
      .expect(200);

    assert.strictEqual(billDetailsResponse.body.title, `Environmental Protection Act ${timestamp}`);
    assert.strictEqual(billDetailsResponse.body.status, 'proposed');
    console.log('✓ Bill details verified');

    // Step 8: Verify votes list
    console.log('Step 8: Verifying votes list...');
    const votesResponse = await request(app)
      .get(`/api/bills/${billResponse.body.id}/votes`)
      .expect(200);

    assert(Array.isArray(votesResponse.body));
    assert.strictEqual(votesResponse.body.length, 2);
    console.log('✓ Votes list verified: 2 votes recorded');

    console.log('🎉 Demo flow completed successfully!');
    console.log('Summary:');
    console.log('- Created user: alice');
    console.log('- Created party: Progressive Party');
    console.log('- Proposed bill: Environmental Protection Act');
    console.log('- Created second user: bob');
    console.log('- alice voted: aye');
    console.log('- bob voted: nay');
    console.log('- Final vote count: aye=1, nay=1, abstain=0');
  });
});
