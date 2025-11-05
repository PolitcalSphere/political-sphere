import fs from "node:fs";
import path from "node:path";
import type BetterSqlite3 from "better-sqlite3";

/**
 * Game data structure stored in the database
 */
interface GameData {
  [key: string]: unknown;
}

/**
 * Audit event record
 */
interface AuditRecord {
  id: string;
  ts: number;
  contentId: string;
  event: string;
}

/**
 * Database adapter interface
 */
interface DatabaseAdapter {
  getAllGames(): Map<string, GameData> | Promise<Map<string, GameData>>;
  getGame(id: string): GameData | null | Promise<GameData | null>;
  upsertGame(id: string, obj: GameData): void | Promise<void>;
  deleteGame(id: string): void | Promise<void>;
  logAudit(contentId: string, event: string): void | Promise<void>;
}

// Use better-sqlite3 if available for synchronous, simple usage. Fall back to sqlite3 if not.
let Database: typeof BetterSqlite3 | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Database = require("better-sqlite3") as typeof BetterSqlite3;
} catch {
  // will attempt to use sqlite3 and a small wrapper
  Database = null;
}

const DB_PATH: string =
  process.env.GAME_SERVER_DB || path.join(__dirname, "..", "data", "games.db");

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initWithBetterSqlite(): DatabaseAdapter {
  if (!Database) {
    throw new Error("better-sqlite3 not available");
  }

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
    getAllGames(): Map<string, GameData> {
      const rows = db.prepare("SELECT id, json FROM games").all() as Array<{
        id: string;
        json: string;
      }>;
      const map = new Map<string, GameData>();
      rows.forEach((r) => {
        map.set(r.id, JSON.parse(r.json) as GameData);
      });
      return map;
    },
    getGame(id: string): GameData | null {
      const row = db.prepare("SELECT json FROM games WHERE id = ?").get(id) as
        | { json: string }
        | undefined;
      return row ? (JSON.parse(row.json) as GameData) : null;
    },
    upsertGame(id: string, obj: GameData): void {
      const json = JSON.stringify(obj);
      db.prepare(
        "INSERT INTO games (id, json) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json=excluded.json"
      ).run(id, json);
    },
    deleteGame(id: string): void {
      db.prepare("DELETE FROM games WHERE id = ?").run(id);
    },
    logAudit(contentId: string, event: string): void {
      const ts = Date.now();
      const eid = `audit_${ts}_${Math.random().toString(36).slice(2, 9)}`;
      const record: AuditRecord = { id: eid, contentId, ts, event };
      db.prepare("INSERT INTO audit (id, ts, event) VALUES (?, ?, ?)").run(
        eid,
        ts,
        JSON.stringify(record)
      );
    },
  };
}

async function initWithSqlite3(): Promise<DatabaseAdapter> {
  // Basic async wrapper using sqlite3
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sqlite3 = require("sqlite3").verbose() as typeof import("sqlite3");
  ensureDir(DB_PATH);
  const db = new sqlite3.Database(DB_PATH);

  function run(
    sql: string,
    params: unknown[] = []
  ): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) =>
      db.run(
        sql,
        params,
        function (
          this: { lastID: number; changes: number },
          err: Error | null
        ) {
          if (err) {
            reject(err);
          } else {
            resolve(this);
          }
        }
      )
    );
  }

  function all(sql: string, params: unknown[] = []): Promise<unknown[]> {
    return new Promise((resolve, reject) =>
      db.all(sql, params, (err: Error | null, rows: unknown[]) =>
        err ? reject(err) : resolve(rows)
      )
    );
  }

  async function ensure(): Promise<void> {
    await run(
      `CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, json TEXT NOT NULL)`
    );
    await run(
      `CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, event TEXT NOT NULL)`
    );
  }

  await ensure();

  return {
    async getAllGames(): Promise<Map<string, GameData>> {
      const rows = (await all("SELECT id, json FROM games")) as Array<{
        id: string;
        json: string;
      }>;
      const map = new Map<string, GameData>();
      rows.forEach((r) => {
        map.set(r.id, JSON.parse(r.json) as GameData);
      });
      return map;
    },
    async getGame(id: string): Promise<GameData | null> {
      const rows = (await all("SELECT json FROM games WHERE id = ?", [
        id,
      ])) as Array<{
        json: string;
      }>;
      return rows[0] ? (JSON.parse(rows[0].json) as GameData) : null;
    },
    async upsertGame(id: string, obj: GameData): Promise<void> {
      const json = JSON.stringify(obj);
      await run(
        "INSERT INTO games (id, json) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json",
        [id, json]
      );
    },
    async deleteGame(id: string): Promise<void> {
      await run("DELETE FROM games WHERE id = ?", [id]);
    },
    async logAudit(contentId: string, event: string): Promise<void> {
      const ts = Date.now();
      const eid = `audit_${ts}_${Math.random().toString(36).slice(2, 9)}`;
      const record: AuditRecord = { id: eid, contentId, ts, event };
      await run("INSERT INTO audit (id, ts, event) VALUES (?, ?, ?)", [
        eid,
        ts,
        JSON.stringify(record),
      ]);
    },
  };
}

function initJsonFallback(): DatabaseAdapter {
  const DATA_FILE = path.join(__dirname, "..", "data", "games.json");
  const AUDIT_FILE = path.join(__dirname, "..", "data", "audit.json");

  function loadGames(): Map<string, GameData> {
    try {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      const obj = JSON.parse(raw) as Record<string, GameData>;
      return new Map(Object.entries(obj));
    } catch {
      return new Map();
    }
  }

  function saveGames(map: Map<string, GameData>): void {
    try {
      const obj = Object.fromEntries(map);
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), "utf8");
    } catch (err) {
      const error = err as Error;
      // eslint-disable-next-line no-console
      console.warn(
        "Failed to persist games store (fallback):",
        error.message || error
      );
    }
  }

  function logAuditRecord(contentId: string, event: string): void {
    try {
      const dir = path.dirname(AUDIT_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const rec: AuditRecord = {
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        ts: Date.now(),
        contentId,
        event,
      };
      let arr: AuditRecord[] = [];
      try {
        arr = JSON.parse(fs.readFileSync(AUDIT_FILE, "utf8")) as AuditRecord[];
      } catch {
        arr = [];
      }
      arr.push(rec);
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(arr, null, 2), "utf8");
    } catch {
      // swallow
    }
  }

  return {
    getAllGames(): Map<string, GameData> {
      return loadGames();
    },
    getGame(id: string): GameData | null {
      const m = loadGames();
      return m.get(id) || null;
    },
    upsertGame(id: string, obj: GameData): void {
      const m = loadGames();
      m.set(id, obj);
      saveGames(m);
    },
    deleteGame(id: string): void {
      const m = loadGames();
      m.delete(id);
      saveGames(m);
    },
    logAudit(contentId: string, event: string): void {
      logAuditRecord(contentId, event);
    },
  };
}

// Initialize appropriate adapter
let adapter: DatabaseAdapter | Promise<DatabaseAdapter>;

if (Database) {
  try {
    adapter = initWithBetterSqlite();
  } catch (err) {
    const error = err as Error;
    // eslint-disable-next-line no-console
    console.warn(
      "better-sqlite3 initialisation failed, falling back to sqlite3/json:",
      error?.message ?? error
    );
    Database = null; // allow fallback to continue
    // Retry with sqlite3 or JSON fallback
    try {
      require.resolve("sqlite3");
      adapter = initWithSqlite3();
    } catch {
      // eslint-disable-next-line no-console
      console.warn(
        "No sqlite native modules found, using JSON file fallback for persistence"
      );
      adapter = initJsonFallback();
    }
  }
} else {
  // try sqlite3 runtime; if not available, fall back to a pure-JS JSON adapter
  try {
    require.resolve("sqlite3");
    // initialize async sqlite3 adapter
    adapter = initWithSqlite3();
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      "No sqlite native modules found, using JSON file fallback for persistence"
    );
    adapter = initJsonFallback();
  }
}

export default adapter;
