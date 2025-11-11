/**
 * Testing Pattern Examples
 * 
 * Comprehensive testing examples using Vitest with:
 * - Unit tests (AAA pattern)
 * - Integration tests
 * - End-to-end tests
 * - Mocking strategies
 * 
 * @see docs/05-engineering-and-devops/development/testing.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserFactory, BillFactory, VoteFactory } from '@political-sphere/testing/factories';

// ============================================================================
// UNIT TESTING EXAMPLES
// ============================================================================

describe('UserService - Unit Tests', () => {
  // Setup: Create fresh mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create user with hashed password', async () => {
    // Arrange - Set up test data and dependencies
    const mockHashPassword = vi.fn().mockResolvedValue('hashed_password_123');
    const mockUserRepo = {
      create: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed_password_123',
      }),
    };

    const userService = new UserService(mockUserRepo, mockHashPassword);
    const userData = {
      email: 'test@example.com',
      password: 'PlainPassword123!',
    };

    // Act - Execute the function under test
    const result = await userService.createUser(userData);

    // Assert - Verify expected outcomes
    expect(mockHashPassword).toHaveBeenCalledWith('PlainPassword123!');
    expect(mockUserRepo.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      passwordHash: 'hashed_password_123',
    });
    expect(result.id).toBe('user-1');
    expect(result).not.toHaveProperty('password'); // Security check
  });

  it('should throw error when email already exists', async () => {
    // Arrange
    const mockUserRepo = {
      findByEmail: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
      create: vi.fn(),
    };

    const userService = new UserService(mockUserRepo);

    // Act & Assert - Test error cases
    await expect(
      userService.createUser({ email: 'test@example.com', password: 'pass' })
    ).rejects.toThrow('Email already exists');

    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });
});

// ============================================================================
// INTEGRATION TESTING EXAMPLES
// ============================================================================

describe('Bill Voting - Integration Tests', () => {
  let testDatabase: TestDatabase;
  let billService: BillService;

  beforeEach(async () => {
    // Setup - Initialize test database
    testDatabase = await setupTestDatabase();
    billService = new BillService(testDatabase);
  });

  afterEach(async () => {
    // Cleanup - Clear test data
    await testDatabase.clear();
    await testDatabase.close();
  });

  it('should cast vote and update bill tallies', async () => {
    // Arrange - Create test data using factories
    const user = UserFactory.build();
    const bill = BillFactory.ActiveVoting();

    await testDatabase.insert('users', user);
    await testDatabase.insert('bills', bill);

    // Act - Cast vote
    const vote = await billService.castVote({
      billId: bill.id,
      userId: user.id,
      position: 'for',
    });

    // Assert - Verify database state
    const updatedBill = await testDatabase.findOne('bills', { id: bill.id });
    expect(vote.position).toBe('for');
    expect(updatedBill.votesFor).toBe(1);
    expect(updatedBill.votesAgainst).toBe(0);
  });

  it('should prevent duplicate votes', async () => {
    // Arrange
    const user = UserFactory.build();
    const bill = BillFactory.ActiveVoting();
    const existingVote = VoteFactory.For({ userId: user.id, billId: bill.id });

    await testDatabase.insert('users', user);
    await testDatabase.insert('bills', bill);
    await testDatabase.insert('votes', existingVote);

    // Act & Assert
    await expect(
      billService.castVote({
        billId: bill.id,
        userId: user.id,
        position: 'against',
      })
    ).rejects.toThrow('User has already voted on this bill');
  });
});

// ============================================================================
// REACT COMPONENT TESTING
// ============================================================================

describe('VotingButton - Component Tests', () => {
  it('should render with accessible labels', () => {
    // Arrange
    const mockOnVote = vi.fn();
    const bill = BillFactory.ActiveVoting();

    // Act
    render(<VotingButton bill={bill} onVote={mockOnVote} position="for" />);

    // Assert - Verify accessibility
    const button = screen.getByRole('button', { name: /vote for/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label');
  });

  it('should call onVote when clicked', async () => {
    // Arrange
    const mockOnVote = vi.fn();
    const bill = BillFactory.ActiveVoting();

    render(<VotingButton bill={bill} onVote={mockOnVote} position="for" />);

    // Act
    const button = screen.getByRole('button', { name: /vote for/i });
    fireEvent.click(button);

    // Assert
    await waitFor(() => {
      expect(mockOnVote).toHaveBeenCalledWith('for');
    });
  });

  it('should be disabled for closed bills', () => {
    // Arrange
    const mockOnVote = vi.fn();
    const closedBill = BillFactory.Passed();

    // Act
    render(<VotingButton bill={closedBill} onVote={mockOnVote} position="for" />);

    // Assert
    const button = screen.getByRole('button', { name: /vote for/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('should support keyboard navigation', async () => {
    // Arrange
    const mockOnVote = vi.fn();
    const bill = BillFactory.ActiveVoting();

    render(<VotingButton bill={bill} onVote={mockOnVote} position="for" />);

    // Act - Simulate keyboard interaction
    const button = screen.getByRole('button', { name: /vote for/i });
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });

    // Assert
    await waitFor(() => {
      expect(mockOnVote).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// API ENDPOINT TESTING
// ============================================================================

import request from 'supertest';

describe('POST /api/bills/:id/vote - API Tests', () => {
  let app: Express.Application;
  let authToken: string;

  beforeEach(async () => {
    app = await setupTestApp();
    authToken = await getTestAuthToken();
  });

  it('should accept valid vote', async () => {
    // Arrange
    const bill = BillFactory.ActiveVoting();
    await testDatabase.insert('bills', bill);

    // Act
    const response = await request(app)
      .post(`/api/bills/${bill.id}/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        position: 'for',
        reason: 'I support this legislation',
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      position: 'for',
      billId: bill.id,
    });
  });

  it('should reject vote without authentication', async () => {
    // Arrange
    const bill = BillFactory.ActiveVoting();
    await testDatabase.insert('bills', bill);

    // Act
    const response = await request(app)
      .post(`/api/bills/${bill.id}/vote`)
      .send({ position: 'for' });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Authentication required');
  });

  it('should return 404 for non-existent bill', async () => {
    // Act
    const response = await request(app)
      .post('/api/bills/bill-99999/vote')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ position: 'for' });

    // Assert
    expect(response.status).toBe(404);
    expect(response.body.error).toContain('not found');
  });
});

// ============================================================================
// MOCKING STRATEGIES
// ============================================================================

describe('Mocking Examples', () => {
  it('should mock external API calls', async () => {
    // Arrange - Mock fetch globally
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'mocked' }),
    });

    // Act
    const result = await fetchExternalData();

    // Assert
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/data');
    expect(result).toEqual({ data: 'mocked' });
  });

  it('should mock timers for time-dependent code', async () => {
    // Arrange
    vi.useFakeTimers();
    const callback = vi.fn();

    // Act
    setTimeout(callback, 1000);
    vi.advanceTimersByTime(1000);

    // Assert
    expect(callback).toHaveBeenCalledTimes(1);

    // Cleanup
    vi.useRealTimers();
  });

  it('should spy on existing methods', () => {
    // Arrange
    const userService = new UserService();
    const spy = vi.spyOn(userService, 'findById');

    // Act
    userService.findById('user-1');

    // Assert
    expect(spy).toHaveBeenCalledWith('user-1');

    // Cleanup
    spy.mockRestore();
  });
});

// ============================================================================
// PARAMETERIZED TESTS
// ============================================================================

describe('Password validation', () => {
  const testCases = [
    { password: 'weak', expected: false, reason: 'too short' },
    { password: 'NoNumbers!', expected: false, reason: 'no numbers' },
    { password: 'nonumbers1', expected: false, reason: 'no uppercase' },
    { password: 'NOLOWERCASE1!', expected: false, reason: 'no lowercase' },
    { password: 'ValidPass123!', expected: true, reason: 'valid password' },
  ];

  testCases.forEach(({ password, expected, reason }) => {
    it(`should return ${expected} for ${reason}`, () => {
      expect(isValidPassword(password)).toBe(expected);
    });
  });
});

// ============================================================================
// SNAPSHOT TESTING
// ============================================================================

describe('Bill Component - Snapshot Tests', () => {
  it('should match snapshot for active voting bill', () => {
    const bill = BillFactory.ActiveVoting();
    const { container } = render(<BillCard bill={bill} />);
    
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ============================================================================
// HELPER FUNCTIONS (for examples)
// ============================================================================

class UserService {
  constructor(
    private repo?: any,
    private hashFn?: any
  ) {}

  async createUser(data: any) {
    if (this.repo?.findByEmail) {
      const existing = await this.repo.findByEmail(data.email);
      if (existing) throw new Error('Email already exists');
    }
    
    const passwordHash = this.hashFn 
      ? await this.hashFn(data.password)
      : 'hashed';
    
    return this.repo.create({ email: data.email, passwordHash });
  }

  async findById(id: string) {
    return null;
  }
}

class BillService {
  constructor(private db: any) {}

  async castVote(voteData: any) {
    const existing = await this.db.findOne('votes', {
      userId: voteData.userId,
      billId: voteData.billId,
    });

    if (existing) {
      throw new Error('User has already voted on this bill');
    }

    const vote = await this.db.insert('votes', voteData);

    await this.db.update(
      'bills',
      { id: voteData.billId },
      { $inc: { [`votes${capitalize(voteData.position)}`]: 1 } }
    );

    return vote;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function setupTestDatabase() {
  return {
    insert: async (table: string, data: any) => data,
    findOne: async (table: string, query: any) => null,
    update: async (table: string, query: any, updates: any) => {},
    clear: async () => {},
    close: async () => {},
  };
}

async function setupTestApp() {
  return {} as any;
}

async function getTestAuthToken() {
  return 'test_token_123';
}

async function fetchExternalData() {
  const response = await fetch('https://api.example.com/data');
  return response.json();
}

function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

// Mock components for examples
function VotingButton(props: any) {
  return null;
}

function BillCard(props: any) {
  return null;
}

interface TestDatabase {
  insert: (table: string, data: any) => Promise<any>;
  findOne: (table: string, query: any) => Promise<any>;
  update: (table: string, query: any, updates: any) => Promise<void>;
  clear: () => Promise<void>;
  close: () => Promise<void>;
}
