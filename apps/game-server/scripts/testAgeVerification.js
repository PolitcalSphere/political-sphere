const fetch = require('node-fetch').default || require('node-fetch');

const BASE_URL = 'http://localhost:5100';

async function testAgeVerification() {
  console.log('== Testing Age Verification Integration ==\n');

  // Create a game
  console.log('Creating game...');
  const createRes = await fetch(`${BASE_URL}/games`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Age Verification Test' })
  });
  const createData = await createRes.json();
  const gameId = createData.game.id;
  console.log('Game created:', gameId);

  // Test joining without userId (should succeed)
  console.log('\nJoining without userId (should succeed)...');
  const joinRes1 = await fetch(`${BASE_URL}/games/${gameId}/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName: 'Anonymous Player' })
  });
  const joinData1 = await joinRes1.json();
  console.log('Join result:', joinData1);

  // Test joining with unverified userId (should fail)
  console.log('\nJoining with unverified userId (should fail)...');
  const joinRes2 = await fetch(`${BASE_URL}/games/${gameId}/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName: 'Unverified User', userId: 'unverified-user-123' })
  });
  const joinData2 = await joinRes2.json();
  console.log('Join result:', joinData2);

  // Test joining with verified adult userId (would succeed if API available)
  console.log('\nJoining with verified adult userId (would succeed if API available)...');
  const joinRes3 = await fetch(`${BASE_URL}/games/${gameId}/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName: 'Verified Adult', userId: 'verified-adult-123' })
  });
  const joinData3 = await joinRes3.json();
  console.log('Join result:', joinData3);

  console.log('\n== Age Verification Test Complete ==');
}

testAgeVerification().catch(console.error);
