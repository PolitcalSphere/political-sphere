const { advanceGameState } = require('../../libs/game-engine/src/engine');

describe('game engine', () => {
  test('propose then tied votes -> rejected', () => {
    const initial = {
      id: 'game-1',
      name: 'Test Game',
      players: [ { id: 'p1', displayName: 'Alice' }, { id: 'p2', displayName: 'Bob' } ],
      proposals: [],
      votes: [],
      economy: { treasury: 100, inflationRate: 0.01, unemploymentRate: 0.02 },
      turn: { turnNumber: 1, phase: 'voting' },
      createdAt: new Date().toISOString()
    };

    // Alice proposes
    const actions = [
      { type: 'propose', payload: { title: 'Tax cut', description: 'Cut taxes', proposerId: 'p1' } }
    ];

    const afterPropose = advanceGameState(initial, actions, 42);
    expect(afterPropose.proposals.length).toBe(1);
    const proposalId = afterPropose.proposals[0].id;

    // Tie votes: one for, one against
    const voteActions = [
      { type: 'vote', payload: { proposalId, playerId: 'p1', choice: 'for' } },
      { type: 'vote', payload: { proposalId, playerId: 'p2', choice: 'against' } }
    ];

    const final = advanceGameState(afterPropose, voteActions, 42);
    expect(final.votes.length).toBe(2);
    // tied -> rejected per engine rule
    const finalProposal = final.proposals.find(p => p.id === proposalId);
    expect(finalProposal.status).toBe('rejected');
  });

  test('majority for -> enacted', () => {
    const initial = {
      id: 'game-2',
      name: 'Test Game 2',
      players: [ { id: 'p1', displayName: 'Alice' }, { id: 'p2', displayName: 'Bob' }, { id: 'p3', displayName: 'Cara' } ],
      proposals: [],
      votes: [],
      economy: { treasury: 100, inflationRate: 0.01, unemploymentRate: 0.02 },
      turn: { turnNumber: 1, phase: 'voting' },
      createdAt: new Date().toISOString()
    };

    const actions = [
      { type: 'propose', payload: { title: 'Public Transport', description: 'Expand services', proposerId: 'p2' } }
    ];

    const afterPropose = advanceGameState(initial, actions, 7);
    const proposalId = afterPropose.proposals[0].id;

    const voteActions = [
      { type: 'vote', payload: { proposalId, playerId: 'p1', choice: 'for' } },
      { type: 'vote', payload: { proposalId, playerId: 'p2', choice: 'for' } },
      { type: 'vote', payload: { proposalId, playerId: 'p3', choice: 'against' } }
    ];

    const final = advanceGameState(afterPropose, voteActions, 7);
    const finalProposal = final.proposals.find(p => p.id === proposalId);
    expect(finalProposal.status).toBe('enacted');
  });
});
