import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BillService } from '../../src/domain/bill-service';
import { UserService } from '../../src/domain/user-service';
import { VoteService } from '../../src/domain/vote-service';
import { closeDatabase, getDatabase } from '../../src/modules/stores/index.ts';

describe('VoteService', () => {
  let userService;
  let billService;
  let voteService;

  beforeEach(() => {
    getDatabase();
    userService = new UserService();
    billService = new BillService();
    voteService = new VoteService();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('castVote', () => {
    it('should create a new vote', async () => {
      const user = await userService.createUser({
        username: 'testuser',
        email: 'test@example.com',
      });

      const bill = await billService.proposeBill({
        title: 'Test Bill',
        description: 'A test bill',
        proposerId: user.id,
      });

      const input = {
        billId: bill.id,
        userId: user.id,
        vote: 'aye',
      };

      const vote = await voteService.castVote(input);

      expect(vote.billId).toBe(input.billId);
      expect(vote.userId).toBe(input.userId);
      expect(vote.vote).toBe(input.vote);
      expect(vote.id).toBeTruthy();
      expect(vote.createdAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent bill', async () => {
      const user = await userService.createUser({
        username: 'testuser',
        email: 'test@example.com',
      });

      const input = {
        billId: 'non-existent-bill',
        userId: user.id,
        vote: 'aye',
      };

      await expect(voteService.castVote(input)).rejects.toThrow(/Bill does not exist/);
    });

    it('should throw error for non-existent user', async () => {
      const user = await userService.createUser({
        username: 'testuser',
        email: 'test@example.com',
      });

      const bill = await billService.proposeBill({
        title: 'Test Bill',
        description: 'A test bill',
        proposerId: user.id,
      });

      const input = {
        billId: bill.id,
        userId: 'non-existent-user',
        vote: 'aye',
      };

      await expect(voteService.castVote(input)).rejects.toThrow(/User does not exist/);
    });

    it('should throw error for duplicate vote', async () => {
      const user = await userService.createUser({
        username: 'testuser',
        email: 'test@example.com',
      });

      const bill = await billService.proposeBill({
        title: 'Test Bill',
        description: 'A test bill',
        proposerId: user.id,
      });

      const input = {
        billId: bill.id,
        userId: user.id,
        vote: 'aye',
      };

      await voteService.castVote(input);

      await expect(voteService.castVote(input)).rejects.toThrow(
        /User has already voted on this bill/,
      );
    });
  });

  describe('getBillVotes', () => {
    it('should return votes for a bill', async () => {
      const user1 = await userService.createUser({
        username: 'user1',
        email: 'user1@example.com',
      });

      const user2 = await userService.createUser({
        username: 'user2',
        email: 'user2@example.com',
      });

      const bill = await billService.proposeBill({
        title: 'Test Bill',
        description: 'A test bill',
        proposerId: user1.id,
      });

      const vote1 = await voteService.castVote({
        billId: bill.id,
        userId: user1.id,
        vote: 'aye',
      });

      const vote2 = await voteService.castVote({
        billId: bill.id,
        userId: user2.id,
        vote: 'nay',
      });

      const votes = await voteService.getBillVotes(bill.id);

      expect(votes.length).toBe(2);
      expect(votes.some((v) => v.id === vote1.id)).toBe(true);
      expect(votes.some((v) => v.id === vote2.id)).toBe(true);
    });
  });

  describe('getVoteCounts', () => {
    it('should return vote counts for a bill', async () => {
      const user1 = await userService.createUser({
        username: 'user1',
        email: 'user1@example.com',
      });

      const user2 = await userService.createUser({
        username: 'user2',
        email: 'user2@example.com',
      });

      const user3 = await userService.createUser({
        username: 'user3',
        email: 'user3@example.com',
      });

      const bill = await billService.proposeBill({
        title: 'Test Bill',
        description: 'A test bill',
        proposerId: user1.id,
      });

      await voteService.castVote({
        billId: bill.id,
        userId: user1.id,
        vote: 'aye',
      });

      await voteService.castVote({
        billId: bill.id,
        userId: user2.id,
        vote: 'aye',
      });

      await voteService.castVote({
        billId: bill.id,
        userId: user3.id,
        vote: 'nay',
      });

      const counts = await voteService.getVoteCounts(bill.id);

      expect(counts.aye).toBe(2);
      expect(counts.nay).toBe(1);
      expect(counts.abstain).toBe(0);
    });
  });
});
