/**
 * This file was automatically generated from vote.schema.json.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSON Schema file,
 * and run `npm run schemas:generate` to regenerate this file.
 */

/**
 * A vote cast by a user on a legislative bill
 */
export interface Vote {
  /**
   * Unique identifier for the vote
   */
  id: string;
  /**
   * Bill ID being voted on
   */
  billId: string;
  /**
   * User ID who cast the vote
   */
  userId: string;
  /**
   * Voting position
   */
  position: 'for' | 'against' | 'abstain';
  /**
   * Weight of the vote (default 1.0 for standard votes)
   */
  weight?: number;
  /**
   * Optional explanation for the vote
   */
  reason?: string | null;
  /**
   * Whether the vote is publicly visible
   */
  isPublic?: boolean;
  /**
   * ISO 8601 timestamp when vote was cast
   */
  createdAt: string;
  [k: string]: unknown;
}
