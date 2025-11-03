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
