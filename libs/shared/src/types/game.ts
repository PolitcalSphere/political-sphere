/**
 * Shared game types for Political Sphere
 * Location: `libs/shared/src/types/game.ts`
 * Purpose: single-source-of-truth for game data shapes used by server and frontend
 */

/** Unique identifier type */
export type ID = string;

/** Player representation */
export interface Player {
  id: ID;
  displayName: string;
  avatarUrl?: string;
  role?: 'citizen' | 'moderator' | 'observer' | 'ai';
  createdAt: string; // ISO timestamp
  verifiedAge?: number; // Age verification for compliance
  contentRating?: 'U' | 'PG' | '12' | '15' | '18'; // Age-appropriate content access
  userId?: string; // External user ID for API integration
}

/** Vote on a proposal */
export interface Vote {
  playerId: ID;
  proposalId: ID;
  choice: 'for' | 'against' | 'abstain';
  weight?: number; // for future weighted voting
  timestamp: string; // ISO
}

/** A policy proposal or bill */
export interface Proposal {
  id: ID;
  title: string;
  description: string;
  proposerId: ID;
  createdAt: string;
  status: 'draft' | 'voting' | 'enacted' | 'rejected' | 'abandoned' | 'flagged';
  metadata?: Record<string, unknown>;
  moderationStatus?: 'pending' | 'approved' | 'rejected' | 'flagged'; // Moderation state
  contentRating?: 'U' | 'PG' | '12' | '15' | '18'; // Age appropriateness
  flaggedReasons?: string[]; // Reasons for flagging
}

/** Game economic state (simplified) */
export interface EconomyState {
  treasury: number; // integer currency units
  inflationRate: number; // 0-1
  unemploymentRate: number; // 0-1
}

/** Turn state describes the current turn and phase */
export interface TurnState {
  turnNumber: number;
  phase: 'lobby' | 'proposal' | 'debate' | 'voting' | 'resolution' | 'recess';
  endsAt?: string; // ISO timestamp when phase ends
}

/** Core game state */
export interface GameState {
  id: ID;
  name: string;
  players: Player[];
  proposals: Proposal[];
  votes: Vote[];
  economy: EconomyState;
  turn: TurnState;
  createdAt: string;
  updatedAt?: string;
  contentRating?: 'U' | 'PG' | '12' | '15' | '18'; // Overall game content rating
  moderationEnabled?: boolean; // Whether moderation is active
  ageVerificationRequired?: boolean; // Whether age verification is required to join
}

/** Minimal API contract for creating a game */
export interface CreateGameRequest {
  name: string;
  maxPlayers?: number;
}

export interface CreateGameResponse {
  game: GameState;
}

/** Player action types that mutate game state */
export type PlayerAction =
  | { type: 'propose'; payload: { title: string; description: string; proposerId: ID } }
  | { type: 'vote'; payload: { proposalId: ID; playerId: ID; choice: Vote['choice'] } }
  | { type: 'comment'; payload: { proposalId: ID; playerId: ID; text: string } };
