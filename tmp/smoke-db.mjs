import { initializeDatabase, runMigrations } from '../apps/api/src/migrations/index.js';
import { UserStore } from '../apps/api/src/user-store.js';
import { PartyStore } from '../apps/api/src/party-store.js';
import { BillStore } from '../apps/api/src/bill-store.js';
import { VoteStore } from '../apps/api/src/vote-store.js';

const db = initializeDatabase(':memory:');
await runMigrations(db);

const users = new UserStore(db);
const parties = new PartyStore(db);
const bills = new BillStore(db);
const votes = new VoteStore(db);

const u = users.create({ username: 'alice', email: 'a@example.com' });
const p = parties.create({ name: 'Unity', description: 'desc', color: '#0000ff' });
const b = bills.create({ title: 'Bill A', description: 'Test', proposerId: u.id });
const v = votes.create({ billId: b.id, userId: u.id, vote: 'aye' });

console.log('user', u.username, u.email);
console.log('party', p.name, p.color);
console.log('bill', b.title, b.proposerId);
console.log('vote', v.vote);

const counts = votes.getVoteCounts(b.id);
console.log('counts', counts);

db.close();
