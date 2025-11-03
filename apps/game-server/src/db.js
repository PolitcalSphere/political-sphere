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
