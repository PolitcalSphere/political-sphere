const { advanceGameState } = require('../src/engine');

const initial2 = { id: 'g2', name: 'G2', players: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }], proposals: [], votes: [], economy: {}, turn: {}, createdAt: new Date().toISOString() };
const after2 = advanceGameState(initial2, [ { type: 'propose', payload: { title: 'Y', proposerId: 'p2' } } ], 7);
const proposalId = after2.proposals[0].id;
console.log('proposalId:', proposalId);
const voteActions = [
  { type: 'vote', payload: { proposalId, playerId: 'p1', choice: 'for' } },
  { type: 'vote', payload: { proposalId, playerId: 'p2', choice: 'for' } },
  { type: 'vote', payload: { proposalId, playerId: 'p3', choice: 'against' } }
];
const final = advanceGameState(after2, voteActions, 7);
console.log('votes:', final.votes);
const votesFor = final.votes.filter(v => v.proposalId === proposalId && v.choice === 'for').length;
const votesAgainst = final.votes.filter(v => v.proposalId === proposalId && v.choice === 'against').length;
console.log('votesFor:', votesFor, 'votesAgainst:', votesAgainst);
console.log('final proposal status:', final.proposals.find(p => p.id === proposalId).status);
