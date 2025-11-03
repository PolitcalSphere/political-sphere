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
