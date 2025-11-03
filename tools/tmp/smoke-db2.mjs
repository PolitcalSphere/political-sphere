import Database from 'better-sqlite3';
import { up as migrateUp } from '../apps/api/src/migrations/001_initial_schema.js';

const db = new Database(':memory:');
try {
  db.pragma('foreign_keys = ON');
  migrateUp(db);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1").all();
  console.log('tables', tables.map(t=>t.name));
  const columns = (table) => db.prepare(`PRAGMA table_info(${table})`).all();
  console.log('users cols', columns('users'));
  console.log('parties cols', columns('parties'));
  console.log('bills cols', columns('bills'));
  console.log('votes cols', columns('votes'));
} finally {
  db.close();
}
