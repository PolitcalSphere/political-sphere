/**
 * This file was automatically generated from bill.schema.json.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSON Schema file,
 * and run `npm run schemas:generate` to regenerate this file.
 */

/**
 * A legislative bill proposed in the Political Sphere platform
 */
export interface Bill {
  /**
   * Unique identifier for the bill
   */
  id: string;
  /**
   * Title of the legislative bill
   */
  title: string;
  /**
   * Full description of the bill's purpose and provisions
   */
  description?: string;
  /**
   * User ID of the bill's proposer
   */
  proposerId: string;
  /**
   * Current status of the bill in the legislative process
   */
  status: 'draft' | 'proposed' | 'active_voting' | 'passed' | 'rejected' | 'withdrawn';
  /**
   * Category or policy area of the bill
   */
  category?:
    | 'environment'
    | 'healthcare'
    | 'education'
    | 'economy'
    | 'justice'
    | 'infrastructure'
    | 'defense'
    | 'foreign_policy'
    | null;
  /**
   * ISO 8601 timestamp when voting begins
   */
  votingStartsAt?: string | null;
  /**
   * ISO 8601 timestamp when voting ends
   */
  votingEndsAt?: string | null;
  /**
   * Number of votes in favor
   */
  votesFor?: number;
  /**
   * Number of votes against
   */
  votesAgainst?: number;
  /**
   * Number of abstentions
   */
  votesAbstain?: number;
  /**
   * ISO 8601 timestamp of bill creation
   */
  createdAt: string;
  /**
   * ISO 8601 timestamp of last update
   */
  updatedAt: string;
  [k: string]: unknown;
}
