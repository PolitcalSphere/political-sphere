/**
 * Game Service
 * Manages game state and actions using the game engine
 */

import { advanceGameState } from '../../../../libs/game-engine/src/engine.js'; // eslint-disable-line @nx/enforce-module-boundaries, no-restricted-imports

export interface GameState {
  id: string;
  name: string;
  createdAt: string;
  currentTurn: number;
  phase: 'lobby' | 'debate' | 'voting' | 'enacted';
  players: Array<{
    id: string;
    username: string;
    reputation: number;
    joinedAt: string;
  }>;
  proposals: Array<unknown>;
  votes: Array<unknown>;
  debates: Array<unknown>;
  speeches: Array<unknown>;
  economy: {
    treasury: number;
    inflationRate: number;
    unemploymentRate: number;
  };
  settings: {
    maxPlayers: number;
    turnDuration: number; // seconds
    debateDuration: number; // seconds
  };
  status: 'waiting' | 'active' | 'paused' | 'finished';
}

export interface PlayerAction {
  type: 'propose' | 'vote' | 'speak' | 'start_debate' | 'advance_turn';
  playerId: string;
  payload?: Record<string, unknown>;
}

// In-memory game storage (replace with DB in Phase 2)
const games = new Map<string, GameState>();
const playerGames = new Map<string, Set<string>>(); // playerId -> gameIds

export class GameService {
  /**
   * Create a new game
   */
  createGame(creatorId: string, creatorUsername: string, name: string): GameState {
    const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const game: GameState = {
      id: gameId,
      name: name || 'New Game',
      createdAt: new Date().toISOString(),
      currentTurn: 1,
      phase: 'lobby',
      players: [
        {
          id: creatorId,
          username: creatorUsername,
          reputation: 0,
          joinedAt: new Date().toISOString(),
        },
      ],
      proposals: [],
      votes: [],
      debates: [],
      speeches: [],
      economy: {
        treasury: 100000,
        inflationRate: 0.02,
        unemploymentRate: 0.05,
      },
      settings: {
        maxPlayers: 20,
        turnDuration: 300, // 5 minutes
        debateDuration: 180, // 3 minutes
      },
      status: 'waiting',
    };

    games.set(gameId, game);

    if (!playerGames.has(creatorId)) {
      playerGames.set(creatorId, new Set());
    }
    const creatorGames = playerGames.get(creatorId);
    if (creatorGames) {
      creatorGames.add(gameId);
    }

    return game;
  }

  /**
   * Get game by ID
   */
  getGame(gameId: string): GameState | null {
    return games.get(gameId) || null;
  }

  /**
   * Get all games (for lobby listing)
   */
  listGames(): GameState[] {
    return Array.from(games.values());
  }

  /**
   * Get games for a specific player
   */
  getPlayerGames(playerId: string): GameState[] {
    const gameIds = playerGames.get(playerId);
    if (!gameIds) {
      return [];
    }

    return Array.from(gameIds)
      .map(id => games.get(id))
      .filter((game): game is GameState => game !== undefined);
  }

  /**
   * Join an existing game
   */
  joinGame(gameId: string, playerId: string, username: string): GameState {
    const game = games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status === 'finished') {
      throw new Error('Game has finished');
    }

    if (game.players.length >= game.settings.maxPlayers) {
      throw new Error('Game is full');
    }

    if (game.players.some(p => p.id === playerId)) {
      throw new Error('Already in this game');
    }

    game.players.push({
      id: playerId,
      username,
      reputation: 0,
      joinedAt: new Date().toISOString(),
    });

    if (!playerGames.has(playerId)) {
      playerGames.set(playerId, new Set());
    }
    const playerGameSet = playerGames.get(playerId);
    if (playerGameSet) {
      playerGameSet.add(gameId);
    }

    return game;
  }

  /**
   * Process a player action
   */
  processAction(gameId: string, action: PlayerAction): GameState {
    const game = games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'active' && game.status !== 'waiting') {
      throw new Error('Game is not active');
    }

    // Verify player is in game
    const player = game.players.find(p => p.id === action.playerId);
    if (!player) {
      throw new Error('Player not in this game');
    }

    // Enrich payload with implicit player identifiers so clients don't need to duplicate
    const enrichedAction: PlayerAction = {
      ...action,
      payload: { ...(action.payload || {}) },
    };
    if (
      enrichedAction.type === 'vote' &&
      enrichedAction.payload &&
      !enrichedAction.payload.playerId
    ) {
      enrichedAction.payload.playerId = enrichedAction.playerId;
    }
    if (
      enrichedAction.type === 'propose' &&
      enrichedAction.payload &&
      !enrichedAction.payload.proposerId
    ) {
      enrichedAction.payload.proposerId = enrichedAction.playerId;
    }

    // Use game engine to advance state
    const seed = Date.now();
    const newState = advanceGameState(game, [enrichedAction], seed);

    // Merge engine state back into game
    game.proposals = newState.proposals || [];
    game.votes = newState.votes || [];
    game.debates = newState.debates || [];
    game.speeches = newState.speeches || [];

    if (newState.economy) {
      game.economy = newState.economy;
    }

    return game;
  }

  /**
   * Start a game (move from lobby to active)
   */
  startGame(gameId: string, playerId: string): GameState {
    const game = games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    // Verify player is creator (first player)
    if (!game.players[0] || game.players[0].id !== playerId) {
      throw new Error('Only game creator can start the game');
    }

    if (game.status !== 'waiting') {
      throw new Error('Game already started');
    }

    if (game.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    game.status = 'active';
    game.phase = 'debate';

    return game;
  }

  /**
   * Delete a game
   */
  deleteGame(gameId: string, playerId: string): void {
    const game = games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    // Only creator can delete
    if (!game.players[0] || game.players[0].id !== playerId) {
      throw new Error('Only game creator can delete the game');
    }

    // Remove from all players' lists
    game.players.forEach(player => {
      const playerGameSet = playerGames.get(player.id);
      if (playerGameSet) {
        playerGameSet.delete(gameId);
      }
    });

    games.delete(gameId);
  }
}

export const gameService = new GameService();
