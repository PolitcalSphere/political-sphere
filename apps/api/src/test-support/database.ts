/**
 * Test-specific database utilities
 *
 * Provides a clean abstraction for tests to interact with the database
 * without directly importing from internal store modules.
 *
 * This module is designed specifically for testing and should not be used
 * in production code.
 */

import { type DatabaseConnection, getDatabase, closeDatabase } from '../modules/stores/index.ts';

/**
 * Database test interface
 * Provides methods for setting up, tearing down, and interacting with test databases
 */
export class TestDatabase {
  private connection: DatabaseConnection | null = null;

  /**
   * Initialize database for tests
   * @returns Database connection instance
   */
  async setup(): Promise<DatabaseConnection> {
    this.connection = getDatabase();
    return this.connection;
  }

  /**
   * Clean up database after tests
   */
  async teardown(): Promise<void> {
    closeDatabase();
    this.connection = null;
  }

  /**
   * Get the current database connection
   * @throws Error if database is not initialized
   */
  getConnection(): DatabaseConnection {
    if (!this.connection) {
      throw new Error('Database not initialized. Call setup() first.');
    }
    return this.connection;
  }

  /**
   * Create a test user with default values
   * @param overrides - Properties to override defaults
   * @returns Created user
   */
  async createTestUser(overrides: Record<string, any> = {}): Promise<any> {
    const db = this.getConnection();
    const userData = {
      username: `testuser_${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      ...overrides,
    };
    return db.users.create(userData);
  }

  /**
   * Create a test party with default values
   * @param overrides - Properties to override defaults
   * @returns Created party
   */
  async createTestParty(overrides: Record<string, any> = {}): Promise<any> {
    const db = this.getConnection();
    const partyData = {
      name: `Test Party ${Date.now()}`,
      description: 'A test political party',
      color: '#FF6B6B',
      ...overrides,
    };
    return db.parties.create(partyData);
  }

  /**
   * Create a test bill with default values
   * @param overrides - Properties to override defaults
   * @returns Created bill
   */
  async createTestBill(overrides: Record<string, any> = {}): Promise<any> {
    const db = this.getConnection();
    const billData = {
      title: `Test Bill ${Date.now()}`,
      description: 'A test bill for political simulation',
      proposerId: overrides.proposerId || (await this.createTestUser()).id,
      ...overrides,
    };
    return db.bills.create(billData);
  }
}

/**
 * Singleton instance for convenience
 */
let testDbInstance: TestDatabase | null = null;

/**
 * Get or create the test database instance
 */
export function getTestDatabase(): TestDatabase {
  if (!testDbInstance) {
    testDbInstance = new TestDatabase();
  }
  return testDbInstance;
}

/**
 * Reset the test database instance
 * Useful for ensuring clean state between test suites
 */
export function resetTestDatabase(): void {
  testDbInstance = null;
}
