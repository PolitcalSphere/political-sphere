/**
 * Deterministic game rules engine
 * Provides a pure function `advanceGameState(game, actions, seed)` that
 * applies player actions and resolves simple proposal voting deterministically
 * given a numeric seed.
 *
 * Updated to include structured debate, turn-based phases, and basic economy simulation.
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

// Economy simulation: simple effects from enacted policies
function simulateEconomy(economy, enactedPolicies) {
  let { treasury, inflationRate, unemploymentRate } = economy;

  // Base changes
  treasury += 10000; // Base income
  inflationRate = Math.max(0, inflationRate + 0.001); // Slight inflation increase
  unemploymentRate = Math.max(0, unemploymentRate - 0.001); // Slight decrease

  // Policy effects (simple examples)
  for (const policy of enactedPolicies) {
    if (policy.title.toLowerCase().includes('tax')) {
      treasury += 5000;
      inflationRate += 0.005;
    }
    if (policy.title.toLowerCase().includes('welfare')) {
      treasury -= 2000;
      unemploymentRate -= 0.01;
    }
    if (policy.title.toLowerCase().includes('austerity')) {
      treasury += 3000;
      unemploymentRate += 0.005;
    }
  }

  return { treasury: Math.max(0, treasury), inflationRate, unemploymentRate };
}

/**
 * Advance the provided game state by applying actions in order.
 * Returns a new game state (does not mutate the input).
 *
 * Rules implemented:
 * - Phases: lobby, debate, voting, enacted
 * - 'propose' adds a proposal with status 'debate'
 * - 'start_debate' moves proposal to debate phase with speaking order
 * - 'speak' adds speech to debate (time-limited)
 * - 'vote' records a vote
 * - 'advance_turn' moves to next phase or turn
 * - After voting, proposals are resolved and economy simulated
 *
 * @param {Object} game - GameState-like object
 * @param {Array<Object>} actions - array of PlayerAction objects
 * @param {number} seed - numeric seed for RNG (optional)
 */
function advanceGameState(game, actions = [], seed = 1) {
  const rng = mulberry32(Number(seed) || 1);
  // Deep clone simple JSON-serializable state
  const state = JSON.parse(JSON.stringify(game));

  // Track proposals that existed before this advance call
  const preExistingProposalIds = new Set((game.proposals || []).map(p => p.id));

  // Safety: ensure arrays exist
  state.proposals = state.proposals || [];
  state.votes = state.votes || [];
  state.debates = state.debates || [];
  state.speeches = state.speeches || [];
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
          status: 'proposed',
          debateId: null,
        };
        state.proposals.push(proposal);
        break;
      }
      case 'start_debate': {
        const payload = action.payload || {};
        const proposal = state.proposals.find(p => p.id === payload.proposalId);
        if (!proposal || proposal.status !== 'proposed') break;

        const debateId = deterministicId('debate', rng);
        const debate = {
          id: debateId,
          proposalId: payload.proposalId,
          speakingOrder: payload.speakingOrder || state.players.map(p => p.id), // Simple round-robin
          currentSpeakerIndex: 0,
          timeLimit: 300000, // 5 minutes per speaker
          startedAt: new Date(1000 * counter + Math.floor(rng() * 1000)).toISOString(),
          status: 'active',
        };
        state.debates.push(debate);
        proposal.status = 'debate';
        proposal.debateId = debateId;
        break;
      }
      case 'speak': {
        const payload = action.payload || {};
        const debate = state.debates.find(d => d.id === payload.debateId);
        if (!debate || debate.status !== 'active') break;

        const speech = {
          id: deterministicId('speech', rng),
          debateId: payload.debateId,
          speakerId: payload.speakerId,
          content: payload.content || '',
          timestamp: new Date(1000 * counter + Math.floor(rng() * 1000)).toISOString(),
        };
        state.speeches.push(speech);

        // Advance speaker
        debate.currentSpeakerIndex = (debate.currentSpeakerIndex + 1) % debate.speakingOrder.length;
        if (debate.currentSpeakerIndex === 0) {
          debate.status = 'completed';
        }
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
      case 'advance_turn': {
        // Move proposals from debate to voting if debate completed
        for (const proposal of state.proposals) {
          if (proposal.status === 'debate') {
            const debate = state.debates.find(d => d.id === proposal.debateId);
            if (debate && debate.status === 'completed') {
              proposal.status = 'voting';
            }
          }
        }
        // Increment turn
        state.turn = state.turn || { turnNumber: 0, phase: 'lobby' };
        state.turn.turnNumber += 1;
        break;
      }
      default:
        // unknown actions are ignored
        break;
    }
  }

  // Resolve voting proposals
  const enactedPolicies = [];
  for (const proposal of state.proposals) {
    if (proposal.status !== 'voting') continue;
    if (!preExistingProposalIds.has(proposal.id)) continue;

    const votesFor = state.votes.filter(v => v.proposalId === proposal.id && v.choice === 'for').length;
    const votesAgainst = state.votes.filter(v => v.proposalId === proposal.id && v.choice === 'against').length;

    if (votesFor > votesAgainst) {
      proposal.status = 'enacted';
      enactedPolicies.push(proposal);
    } else {
      proposal.status = 'rejected';
    }
  }

  // Simulate economy based on enacted policies
  if (enactedPolicies.length > 0 && state.economy) {
    state.economy = simulateEconomy(state.economy, enactedPolicies);
  }

  // update metadata
  state.updatedAt = new Date().toISOString();
  return state;
}

module.exports = { advanceGameState, mulberry32, deterministicId };
