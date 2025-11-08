import {
  type CreateVoteInput,
  CreateVoteSchema,
  type Vote,
} from "@political-sphere/shared";
import { getDatabase } from "../modules/stores/index.js";

export class VoteService {
  // Lazy getter to avoid stale DB connections in tests
  private get db() {
    return getDatabase();
  }

  async castVote(input: CreateVoteInput): Promise<Vote> {
    // Validate input
    CreateVoteSchema.parse(input);

    // Verify bill exists
    const bill = await this.db.bills.getById(input.billId);
    if (!bill) {
      throw new Error("Bill does not exist");
    }

    // Verify user exists
    const user = await this.db.users.getById(input.userId);
    if (!user) {
      throw new Error("User does not exist");
    }

    // Check if user has already voted on this bill (await the async store method)
    const hasVoted = await this.db.votes.hasUserVotedOnBill(
      input.userId,
      input.billId
    );
    if (hasVoted) {
      throw new Error("User has already voted on this bill");
    }

    return this.db.votes.create(input);
  }

  async getVoteById(id: string): Promise<Vote | null> {
    return this.db.votes.getById(id);
  }

  async getBillVotes(billId: string): Promise<Vote[]> {
    return this.db.votes.getByBillId(billId);
  }

  async getUserVotes(userId: string): Promise<Vote[]> {
    return this.db.votes.getByUserId(userId);
  }

  async getVoteCounts(
    billId: string
  ): Promise<{ aye: number; nay: number; abstain: number }> {
    return this.db.votes.getVoteCounts(billId);
  }
}
