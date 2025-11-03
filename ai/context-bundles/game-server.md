# Game Server Snapshot

> Generated: 2025-11-03T19:06:07.594Z

## apps/game-server/README.md

```
# Game Server (scaffold)

This is a minimal scaffold for the Political Sphere game server used for local development and early integration tests.

Purpose:
- Provide a tiny HTTP API to create/join games and submit player actions.
- Use an in-memory store for rapid iteration. Replace with a database in later iterations.

Quick start:

```bash
cd apps/game-server
npm ci
npm start
```

Endpoints:
- `GET /healthz` — health check
- `POST /games` — create a game `{ name }`
- `POST /games/:id/join` — join with `{ displayName }`
- `GET /games/:id/state` — current game state
- `POST /games/:id/action` — submit action `{ action: { type, payload } }`

Notes:
- This is intentionally lightweight. Follow repo conventions for packaging and tests when promoting to production.
```

## apps/game-server/src/index.js

```
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { advanceGameState } = require('../../../libs/game-engine/src/engine');
const complianceClient = require('./complianceClient');

const fs = require('fs');
const path = require('path');

// DB adapter (SQLite) handles persistence
const dbModule = require('./db');
const dbReady = dbModule && typeof dbModule.then === 'function' ? dbModule : Promise.resolve(dbModule);

let db = null;
let games = new Map();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Healthcheck
app.get('/healthz', (_, res) => res.json({ status: 'ok' }));

// Simple local moderation (scaffold) — regex-based checks for early compliance
function localModeration(text) {
  const reasons = [];
  const lower = (text || '').toLowerCase();

  // simple hate/violence patterns
  if (/\b(hate|kill|murder|terror|bomb|weapon)\b/.test(lower)) reasons.push('Potential hate/violence');
  // child safety
  if (/\b(child|kid|minor).*(sex|porn|naked)\b/.test(lower)) reasons.push('Child safety');
  // profanity
  if (/\b(fuck|shit|bitch|asshole)\b/.test(lower)) reasons.push('Profanity');

  return { isSafe: reasons.length === 0, reasons };
}

// (remote moderation implementation provided further below)

// Remote moderation client with retries, auth and compliance logging
const MODERATION_ENDPOINT = process.env.API_MODERATION_URL || (process.env.API_BASE_URL ? `${process.env.API_BASE_URL.replace(/\/$/, '')}/api/moderation/analyze` : 'http://localhost:4000/api/moderation/analyze');

async function remoteModeration(text, userId = null) {
  if (!MODERATION_ENDPOINT) return null;

  const maxAttempts = 3;
  const apiKey = process.env.MODERATION_API_KEY || process.env.API_KEY || null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutMs = 3000 * Math.pow(2, attempt - 1); // exponential backoff on timeout
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const headers = { 'content-type': 'application/json' };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      const res = await fetch(MODERATION_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: text, userId, type: 'text' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        // Log non-2xx for observability, and retry if attempts remain
        const body = await res.text().catch(() => '<no-body>');
        console.warn(`Moderation API responded ${res.status} (attempt ${attempt}): ${body}`);
        if (attempt === maxAttempts) {
          // Record failure in compliance logs for audit
          await complianceClient.logEvent({
            category: 'content_moderation',
            action: 'moderation_api_failure',
            details: { endpoint: MODERATION_ENDPOINT, status: res.status, body },
            complianceFrameworks: ['DSA']
          }).catch(() => {});
        }
        continue;
      }

      const data = await res.json().catch(() => null);
  if (data?.success && typeof data?.data?.isSafe === 'boolean') {
        // Record the check for auditability (non-blocking)
        complianceClient.logEvent({
          category: 'content_moderation',
          action: 'moderation_checked',
          userId,
          details: { endpoint: MODERATION_ENDPOINT, isSafe: data.data.isSafe, reasons: data.data.reasons || [], category: data.data.category || null },
          complianceFrameworks: ['DSA']
        }).catch(() => {});

        return {
          isSafe: data.data.isSafe,
          reasons: data.data.reasons || [],
          category: data.data.category || null,
          raw: data.data
        };
      }

      // Unexpected response shape
      console.warn('Moderation API returned unexpected payload', { attempt, data });
      if (attempt === maxAttempts) {
        await complianceClient.logEvent({
          category: 'content_moderation',
          action: 'moderation_unexpected_response',
          details: { endpoint: MODERATION_ENDPOINT, data },
          complianceFrameworks: ['DSA']
        }).catch(() => {});
      }
      return null;
    } catch (err) {
      console.warn(`remoteModeration attempt ${attempt} error: ${err.message}`);
      if (attempt === maxAttempts) {
        await complianceClient.logEvent({
          category: 'content_moderation',
          action: 'moderation_error',
          details: { message: err.message, endpoint: MODERATION_ENDPOINT },
          complianceFrameworks: ['DSA']
        }).catch(() => {});
        return null;
      }
      // small backoff before retrying
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt - 1)));
    }
  }

  return null;
}

// Create a new game
app.post('/games', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = uuidv4();
  const now = new Date().toISOString();
  const game = {
    id,
    name,
    players: [],
    proposals: [],
    votes: [],
    economy: { treasury: 100000, inflationRate: 0.02, unemploymentRate: 0.05 },
    turn: { turnNumber: 0, phase: 'lobby' },
    createdAt: now,
    updatedAt: now,
    contentRating: 'PG', // Default content rating
    moderationEnabled: true,
    ageVerificationRequired: true
  };

  games.set(id, game);
    // persist the new game
    if (db && typeof db.upsertGame === 'function') {
      await db.upsertGame(id, game);
    }

  // Log game creation for compliance
  await complianceClient.logGameCreated(id, req.body?.userId || req.user?.id || 'anonymous', name);

  return res.status(201).json({ game });
});

// Age verification and access check endpoints
const AGE_STATUS_ENDPOINT = process.env.API_BASE_URL ? `${process.env.API_BASE_URL.replace(/\/$/, '')}/api/age/status` : 'http://localhost:4000/api/age/status';
const AGE_CHECK_ACCESS_ENDPOINT = process.env.API_BASE_URL ? `${process.env.API_BASE_URL.replace(/\/$/, '')}/api/age/check-access` : 'http://localhost:4000/api/age/check-access';

async function checkAgeVerification(userId) {
  if (!AGE_STATUS_ENDPOINT) return { verified: false, age: null };

  try {
    const res = await fetch(AGE_STATUS_ENDPOINT, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userId}`, // Assuming userId is a token
        'content-type': 'application/json'
      }
    });

    if (!res.ok) return { verified: false, age: null };
    const data = await res.json();
    return data.success ? data.data : { verified: false, age: null };
  } catch (_) {
    return { verified: false, age: null };
  }
}

async function checkContentAccess(userId, contentRating) {
  if (!AGE_CHECK_ACCESS_ENDPOINT) return false;

  try {
    const res = await fetch(AGE_CHECK_ACCESS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userId}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ contentRating })
    });

    if (!res.ok) return false;
    const data = await res.json();
    return data.success ? data.data.canAccess : false;
  } catch (_) {
    return false;
  }
}

// Join a game
app.post('/games/:id/join', async (req, res) => {
  const { id } = req.params;
  const { displayName, userId } = req.body;
  const game = games.get(id);
  if (!game) return res.status(404).json({ error: 'game not found' });
  if (!displayName) return res.status(400).json({ error: 'displayName is required' });

  // Check age verification if required
  if (game.ageVerificationRequired) {
    if (!userId) {
      return res.status(403).json({
        error: 'User ID required',
        message: 'You must be authenticated to join this game'
      });
    }

    const ageStatus = await checkAgeVerification(userId);
    if (!ageStatus.verified) {
      return res.status(403).json({
        error: 'Age verification required',
        message: 'You must verify your age to join this game'
      });
    }

    // Check content access
    const canAccess = await checkContentAccess(userId, game.contentRating || 'PG');
    if (!canAccess) {
      return res.status(403).json({
        error: 'Content access denied',
        message: 'This game content is not suitable for your age group'
      });
    }
  }

  const player = {
    id: uuidv4(),
    displayName,
    createdAt: new Date().toISOString(),
    verifiedAge: userId ? (await checkAgeVerification(userId)).age : null,
    contentRating: game.contentRating || 'PG'
  };

  game.players.push(player);
  game.updatedAt = new Date().toISOString();
  games.set(id, game);
    if (db && typeof db.upsertGame === 'function') {
      await db.upsertGame(id, game);
    }

  // Log player join for compliance
  await complianceClient.logPlayerJoined(id, userId || player.id, displayName);

  return res.status(200).json({ player, game });
});

// Get game state
app.get('/games/:id/state', (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'game not found' });
  return res.json({ game });
});

// List flagged proposals for a game (moderator view)
app.get('/games/:id/flags', (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'game not found' });
  const flagged = (game.proposals || []).filter((p) => p.status === 'flagged' || p.moderationStatus === 'flagged');
  return res.json({ flagged });
});

// Moderator review endpoint for flagged proposals
app.post('/games/:id/flags/:proposalId/review', async (req, res) => {
  const { id: gameId, proposalId } = { id: req.params.id, proposalId: req.params.proposalId };
  const { moderatorId, action, note } = req.body || {};
  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'game not found' });

  const proposal = (game.proposals || []).find((p) => p.id === proposalId);
  if (!proposal) return res.status(404).json({ error: 'proposal not found' });
  if (proposal.status !== 'flagged' && proposal.moderationStatus !== 'flagged') {
    return res.status(400).json({ error: 'proposal is not flagged for review' });
  }

  if (!moderatorId || !action) return res.status(400).json({ error: 'moderatorId and action are required' });

  if (action === 'approve') {
    proposal.status = 'voting';
    proposal.moderationStatus = 'approved';
    proposal.reviewedAt = new Date().toISOString();
    proposal.reviewedBy = moderatorId;
    proposal.reviewNote = note || null;
  } else if (action === 'reject') {
    proposal.status = 'rejected';
    proposal.moderationStatus = 'rejected';
    proposal.reviewedAt = new Date().toISOString();
    proposal.reviewedBy = moderatorId;
    proposal.reviewNote = note || null;
  } else {
    return res.status(400).json({ error: 'invalid action - must be "approve" or "reject"' });
  }

  game.updatedAt = new Date().toISOString();
  games.set(gameId, game);
    if (db && typeof db.upsertGame === 'function') await db.upsertGame(gameId, game);

  // Log moderation action
  await complianceClient.logModerationAction(proposalId, moderatorId, action, proposal.flaggedReasons || []);

  return res.json({ proposal });
});

// Submit player action (propose, vote) — integrated with deterministic engine
app.post('/games/:id/action', async (req, res) => {
  const gameId = req.params.id;
  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'game not found' });

  const { action } = req.body;
  if (!action || !action.type) return res.status(400).json({ error: 'action.type required' });

// Handle propose with moderation first
  if (action.type === 'propose') {
    const { title, description, proposerId } = action.payload || {};
    if (!title || !proposerId) return res.status(400).json({ error: 'title and proposerId are required' });

    const text = `${title}\n${description || ''}`;
    const remote = await remoteModeration(text, proposerId);
    const moderation = remote ?? localModeration(text);

    if (!moderation.isSafe) {
      // store flagged proposal for moderator review (audit trail)
      const flagged = {
        id: uuidv4(),
        title,
        description: description || '',
        proposerId,
        createdAt: new Date().toISOString(),
        status: 'flagged',
        moderationStatus: 'flagged',
        flaggedReasons: moderation.reasons,
        contentRating: '18' // Flagged content gets highest rating
      };
      game.proposals.push(flagged);
      game.updatedAt = new Date().toISOString();
      games.set(gameId, game);
      if (db && typeof db.upsertGame === 'function') await db.upsertGame(gameId, game);

      // Log flagged proposal
      await complianceClient.logProposalCreated(gameId, flagged.id, proposerId, title, true, true);

      return res.status(201).json({ proposal: flagged, flagged: true, reasons: moderation.reasons });
    }

    // Safe — apply via engine
    const newState = advanceGameState(game, [action], Date.now());
    games.set(gameId, newState);
    if (db && typeof db.upsertGame === 'function') await db.upsertGame(gameId, newState);
    const newProposal = newState.proposals[newState.proposals.length - 1];

    // Log successful proposal creation
    await complianceClient.logProposalCreated(gameId, newProposal.id, proposerId, title, true, false);

    return res.status(201).json({ proposal: newProposal, flagged: false, game: newState });
  }

  // Votes and other actions are routed through the engine
  if (action.type === 'vote') {
    const { proposalId, playerId, choice } = action.payload || {};
    if (!proposalId || !playerId || !choice) return res.status(400).json({ error: 'proposalId, playerId and choice are required' });

  const newState = advanceGameState(game, [action], Date.now());
  games.set(gameId, newState);
      if (db && typeof db.upsertGame === 'function') await db.upsertGame(gameId, newState);
    const vote = newState.votes[newState.votes.length - 1];

    // Log vote for compliance
    await complianceClient.logVoteCast(gameId, proposalId, playerId, choice);

    return res.status(200).json({ vote, game: newState });
  }

  return res.status(400).json({ error: `unknown action type: ${action.type}` });
});

const PORT = process.env.PORT || 5100;

// Start server after DB adapter is ready and games loaded
async function start() {
  try {
    db = await dbReady;
    // load games from DB (works for both sync and async adapters)
    const loaded = await db.getAllGames();
    games = loaded || new Map();
    console.log(`Loaded ${games.size} games from DB`);

    // Import legacy JSON store if present
    try {
      const legacy = path.join(__dirname, '..', 'data', 'games.json');
      if (fs.existsSync(legacy)) {
        const raw = fs.readFileSync(legacy, 'utf8');
        const obj = JSON.parse(raw);
        const entries = Object.entries(obj || {});
        for (const [id, value] of entries) {
          // if not already present, upsert into DB
          if (!games.has(id)) {
            await db.upsertGame(id, value);
            games.set(id, value);
          }
        }
        // rename legacy file after import
        try { fs.renameSync(legacy, legacy + '.imported'); } catch (_) {}
        console.log(`Imported ${entries.length} games from legacy JSON store`);
      }
    } catch (impErr) {
      console.warn('Legacy JSON import failed:', impErr?.message ?? impErr);
    }

    app.listen(PORT, () => console.log(`Game server listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server, DB init error:', err.message || err);
    process.exit(1);
  }
}

start();
```

## apps/game-server/src/db.js

```
const path = require('path');
const fs = require('fs');

// Use better-sqlite3 if available for synchronous, simple usage. Fall back to sqlite3 if not.
let Database;
try {
  Database = require('better-sqlite3');
} catch (_) {
  // will attempt to use sqlite3 and a small wrapper
  Database = null;
}

const DB_PATH = process.env.GAME_SERVER_DB || path.join(__dirname, '..', 'data', 'games.db');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function initWithBetterSqlite() {
  ensureDir(DB_PATH);
  const db = new Database(DB_PATH);

  // Create minimal tables: games (id, json), audit (id, timestamp, event)
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit (
      id TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,
      event TEXT NOT NULL
    );
  `);

  return {
    getAllGames() {
      const rows = db.prepare('SELECT id, json FROM games').all();
      const map = new Map();
      rows.forEach((r) => {
        map.set(r.id, JSON.parse(r.json));
      });
      return map;
    },
    getGame(id) {
      const row = db.prepare('SELECT json FROM games WHERE id = ?').get(id);
      return row ? JSON.parse(row.json) : null;
    },
    upsertGame(id, obj) {
      const json = JSON.stringify(obj);
      db.prepare('INSERT INTO games (id, json) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json=excluded.json').run(id, json);
    },
    deleteGame(id) {
      db.prepare('DELETE FROM games WHERE id = ?').run(id);
    },
    logAudit(contentId, event) {
      const ts = Date.now();
      const eid = `audit_${ts}_${Math.random().toString(36).slice(2,9)}`;
      const record = Object.assign({ contentId, ts }, { event });
      db.prepare('INSERT INTO audit (id, ts, event) VALUES (?, ?, ?)').run(eid, ts, JSON.stringify(record));
    }
  };
}

function initWithSqlite3() {
  // Basic async wrapper using sqlite3
  const sqlite3 = require('sqlite3').verbose();
  ensureDir(DB_PATH);
  const db = new sqlite3.Database(DB_PATH);

  function run(sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, function (err) {
      if (err) reject(err); else resolve(this);
    }));
  }

  function all(sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
  }

  async function ensure() {
    await run(`CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, json TEXT NOT NULL)`);
    await run(`CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, event TEXT NOT NULL)`);
  }

  return (async () => {
    await ensure();
    return {
      async getAllGames() {
        const rows = await all('SELECT id, json FROM games');
        const map = new Map();
        rows.forEach((r) => {
          map.set(r.id, JSON.parse(r.json));
        });
        return map;
      },
      async getGame(id) {
        const rows = await all('SELECT json FROM games WHERE id = ?', [id]);
        return rows[0] ? JSON.parse(rows[0].json) : null;
      },
      async upsertGame(id, obj) {
        const json = JSON.stringify(obj);
        await run('INSERT INTO games (id, json) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json', [id, json]);
      },
      async deleteGame(id) {
        await run('DELETE FROM games WHERE id = ?', [id]);
      },
      async logAudit(contentId, event) {
        const ts = Date.now();
        const eid = `audit_${ts}_${Math.random().toString(36).slice(2,9)}`;
        const record = Object.assign({ contentId, ts }, { event });
        await run('INSERT INTO audit (id, ts, event) VALUES (?, ?, ?)', [eid, ts, JSON.stringify(record)]);
      }
    };
  })();
}

// Initialize appropriate adapter
let adapter;
if (Database) {
  try {
    adapter = initWithBetterSqlite();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('better-sqlite3 initialisation failed, falling back to sqlite3/json:', err?.message ?? err);
    Database = null; // allow fallback to continue
  }
}

if (!adapter) {
  // try sqlite3 runtime; if not available, fall back to a pure-JS JSON adapter
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    require.resolve('sqlite3');
    // initialize async sqlite3 adapter
    adapter = initWithSqlite3();
  } catch (_) {
    // eslint-disable-next-line no-console
    console.warn('No sqlite native modules found, using JSON file fallback for persistence');

    const DATA_FILE = path.join(__dirname, '..', 'data', 'games.json');
    const AUDIT_FILE = path.join(__dirname, '..', 'data', 'audit.json');

    function loadGames() {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const obj = JSON.parse(raw);
        return new Map(Object.entries(obj));
      } catch (_) {
        return new Map();
      }
    }

    function saveGames(map) {
      try {
        const obj = Object.fromEntries(map);
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
      } catch (err2) {
        // eslint-disable-next-line no-console
        console.warn('Failed to persist games store (fallback):', err2.message);
      }
    }

    function logAuditRecord(contentId, event) {
      try {
        const dir = path.dirname(AUDIT_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const rec = { id: `audit_${Date.now()}_${Math.random().toString(36).slice(2,9)}`, ts: Date.now(), contentId, event };
        let arr = [];
        try { arr = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8')); } catch (_) { arr = []; }
        arr.push(rec);
        fs.writeFileSync(AUDIT_FILE, JSON.stringify(arr, null, 2), 'utf8');
      } catch (_) {
        // swallow
      }
    }

    adapter = {
      getAllGames() { return loadGames(); },
      getGame(id) {
        const m = loadGames();
        return m.get(id) || null;
      },
      upsertGame(id, obj) {
        const m = loadGames();
        m.set(id, obj);
        saveGames(m);
      },
      deleteGame(id) {
        const m = loadGames();
        m.delete(id);
        saveGames(m);
      },
      logAudit(contentId, event) { logAuditRecord(contentId, event); }
    };
  }
}

module.exports = adapter;
```

## apps/game-server/scripts/testComplianceLogging.js

```
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5100';

async function testComplianceLogging() {
  console.log('== Testing Compliance Logging ==\n');

  // Create a game
  console.log('Creating game...');
  const createRes = await fetch(`${BASE_URL}/games`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Compliance Logging Test' })
  });
  const createData = await createRes.json();
  const gameId = createData.game.id;
  console.log('Game created:', gameId);

  // Join game
  console.log('\nJoining game...');
  const joinRes = await fetch(`${BASE_URL}/games/${gameId}/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName: 'Test Player' })
  });
  const joinData = await joinRes.json();
  const playerId = joinData.player.id;
  console.log('Player joined:', playerId);

  // Submit safe proposal
  console.log('\nSubmitting safe proposal...');
  const proposeRes = await fetch(`${BASE_URL}/games/${gameId}/action`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: {
        type: 'propose',
        payload: {
          title: 'Improve education funding',
          description: 'Increase budget for schools',
          proposerId: playerId
        }
      }
    })
  });
  const proposeData = await proposeRes.json();
  const proposalId = proposeData.proposal.id;
  console.log('Proposal created:', proposalId);

  // Cast vote
  console.log('\nCasting vote...');
  const voteRes = await fetch(`${BASE_URL}/games/${gameId}/action`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: {
        type: 'vote',
        payload: {
          proposalId: proposalId,
          playerId: playerId,
          choice: 'for'
        }
      }
    })
  });
  const voteData = await voteRes.json();
  console.log('Vote cast:', voteData.vote);

  console.log('\n== Compliance Logging Test Complete ==');
  console.log('Check compliance API logs for audit trail events');
}

testComplianceLogging().catch(console.error);
```

## apps/game-server/scripts/testModeration.js

```
// Simple test script that exercises game-server moderation flow
(async function(){
  const base = 'http://localhost:5100';
  const headers = { 'Content-Type': 'application/json' };

  function log(title, obj) { console.log('\n== ' + title + ' =='); console.log(JSON.stringify(obj, null, 2)); }

  try {
    // Create game
    let res = await fetch(base + '/games', { method: 'POST', headers, body: JSON.stringify({ name: 'Moderation Test' }) });
    const create = await res.json();
    log('create', create);
    const gameId = create.game.id;

    // Join as Alice
    res = await fetch(`${base}/games/${gameId}/join`, { method: 'POST', headers, body: JSON.stringify({ displayName: 'Alice', userId: 'test-user-1' }) });
    const join = await res.json();
    log('join', join);
    const playerId = join.player.id;

    // Submit flagged proposal
    const flaggedAction = {
      action: { type: 'propose', payload: { title: 'I will kill the mayor', description: 'Threatening statement', proposerId: playerId } }
    };
    res = await fetch(`${base}/games/${gameId}/action`, { method: 'POST', headers, body: JSON.stringify(flaggedAction) });
    const flaggedResp = await res.json();
    log('flagged proposal response', flaggedResp);

    // Submit safe proposal
    const safeAction = {
      action: { type: 'propose', payload: { title: 'Improve parks', description: 'Allocate budget to parks', proposerId: playerId } }
    };
    res = await fetch(`${base}/games/${gameId}/action`, { method: 'POST', headers, body: JSON.stringify(safeAction) });
    const safeResp = await res.json();
    log('safe proposal response', safeResp);

  } catch (err) {
    console.error('Test script error', err);
    process.exit(2);
  }
})();
```
