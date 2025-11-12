/**
 * This file was automatically generated from user.schema.json.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSON Schema file,
 * and run `npm run schemas:generate` to regenerate this file.
 */

/**
 * A user account in the Political Sphere platform
 */
export interface User {
  /**
   * Unique identifier for the user
   */
  id: string;
  /**
   * Unique username for the user
   */
  username: string;
  /**
   * User's email address
   */
  email: string;
  /**
   * Hashed password (never send to client)
   */
  passwordHash?: string;
  /**
   * User's role in the system
   */
  role?: 'user' | 'moderator' | 'admin';
  /**
   * Whether the user account is active
   */
  isActive?: boolean;
  /**
   * ISO 8601 timestamp of user creation
   */
  createdAt: string;
  /**
   * ISO 8601 timestamp of last update
   */
  updatedAt: string;
  /**
   * ISO 8601 timestamp of last login
   */
  lastLoginAt?: string | null;
  [k: string]: unknown;
}
