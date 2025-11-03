/**
 * Deterministic game rules engine
 * Provides a pure function `advanceGameState(game, actions, seed)` that
 * applies player actions and resolves simple proposal voting deterministically
 * given a numeric seed.
 */

'use strict';

function mulberry32(a) {
  return function() {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicId(prefix, rng) {
  const n = Math.floor(rng() * 1e9);
  return `${prefix}-${n.toString(36)}`;
}

/**
 * Advance the provided game state by applying actions in order.
 * Returns a new game state (does not mutate the input).
 *
 * Rules implemented (simple prototype):
 * - 'propose' adds a proposal with status 'voting'
 * - 'vote' records a vote
 * - After processing actions, proposals in 'voting' are resolved:
 *    if for > against -> enacted
 *    else -> rejected
 * - Abstain votes are ignored for resolution
 *
 * @param {Object} game - GameState-like object
 * @param {Array<Object>} actions - array of PlayerAction objects
 * @param {number} seed - numeric seed for RNG (optional)
 */
function advanceGameState(game, actions = [], seed = 1) {
  const rng = mulberry32(Number(seed) || 1);
  // Deep clone simple JSON-serializable state
  const state = JSON.parse(JSON.stringify(game));

  // Track proposals that existed before this advance call so we only resolve
  // proposals that were already in voting when we started. This prevents
  // immediately resolving freshly-created proposals in a separate tick.
  const preExistingProposalIds = new Set((game.proposals || []).map(p => p.id));

  // Safety: ensure arrays exist
  state.proposals = state.proposals || [];
  state.votes = state.votes || [];
  let counter = 0;

  for (const action of actions) {
    counter += 1;
    switch (action.type) {
      case 'propose': {
        const payload = action.payload || {};
        const id = deterministicId('proposal', rng);
        const proposal = {
          id,
          title: payload.title || 'Untitled',
          description: payload.description || '',
          proposerId: payload.proposerId || 'unknown',
          createdAt: new Date(1000 * counter + Math.floor(rng() * 1000)).toISOString(),
          status: 'voting',
        };
        state.proposals.push(proposal);
        break;
      }
      case 'vote': {
        const payload = action.payload || {};
        if (!payload.proposalId || !payload.playerId || !payload.choice) break;
        const vote = {
          playerId: payload.playerId,
          proposalId: payload.proposalId,
          choice: payload.choice,
          timestamp: new Date(1000 * counter + Math.floor(rng() * 1000)).toISOString(),
        };
        state.votes.push(vote);
        break;
      }
      default:
        // unknown actions are ignored in this prototype
        break;
    }
  }
  // inspect votes collected after action processing (no logging in production)

  // Resolve voting proposals deterministically (based on collected votes)
  for (const proposal of state.proposals) {
    if (proposal.status !== 'voting') continue;
    if (!preExistingProposalIds.has(proposal.id)) {
      // Skip resolution for proposals that were just created in this advance
      continue;
    }

    const votesFor = state.votes.filter(v => v.proposalId === proposal.id && v.choice === 'for').length;
    const votesAgainst = state.votes.filter(v => v.proposalId === proposal.id && v.choice === 'against').length;
  // deterministically resolve based on collected votes

    if (votesFor > votesAgainst) {
      proposal.status = 'enacted';
    } else {
      // ties and greater against -> rejected
      proposal.status = 'rejected';
    }
  }

  // update metadata
  state.updatedAt = new Date().toISOString();
  return state;
}

module.exports = { advanceGameState, mulberry32, deterministicId };
