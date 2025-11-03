const { advanceGameState } = require('../src/engine');

function assert(condition, msg) {
  if (!condition) {
    console.error('Assertion failed:', msg);
    process.exit(2);
  }
}

console.log('Running smoke tests for game engine...');

// Test 1: tie -> rejected
const initial1 = {
  id: 'g1', name: 'G1', players: [{ id: 'p1' }, { id: 'p2' }], proposals: [], votes: [], economy: {}, turn: {}, createdAt: new Date().toISOString()
};
const after = advanceGameState(initial1, [ { type: 'propose', payload: { title: 'X', proposerId: 'p1' } } ], 11);
const pid = after.proposals[0].id;
const final1 = advanceGameState(after, [ { type: 'vote', payload: { proposalId: pid, playerId: 'p1', choice: 'for' } }, { type: 'vote', payload: { proposalId: pid, playerId: 'p2', choice: 'against' } } ], 11);
console.log('Proposal status (should be rejected):', final1.proposals[0].status);
assert(final1.proposals[0].status === 'rejected', 'Tie should be rejected');

// Test 2: majority for -> enacted
const initial2 = { id: 'g2', name: 'G2', players: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }], proposals: [], votes: [], economy: {}, turn: {}, createdAt: new Date().toISOString() };
const after2 = advanceGameState(initial2, [ { type: 'propose', payload: { title: 'Y', proposerId: 'p2' } } ], 7);
const pid2 = after2.proposals[0].id;
const final2 = advanceGameState(after2, [ { type: 'vote', payload: { proposalId: pid2, playerId: 'p1', choice: 'for' } }, { type: 'vote', payload: { proposalId: pid2, playerId: 'p2', choice: 'for' } }, { type: 'vote', payload: { proposalId: pid2, playerId: 'p3', choice: 'against' } } ], 7);
console.log('Proposal status (should be enacted):', final2.proposals[0].status);
assert(final2.proposals[0].status === 'enacted', 'Majority for should be enacted');

console.log('Smoke tests passed.');
process.exit(0);
