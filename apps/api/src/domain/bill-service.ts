import {
  type Bill,
  type BillStatus,
  type CreateBillInput,
  CreateBillSchema,
} from "@political-sphere/shared";
import { getDatabase } from "../modules/stores/index.js";

export class BillService {
  // Lazy getter to avoid stale DB connections in tests
  private get db() {
    return getDatabase();
  }

  async proposeBill(input: CreateBillInput): Promise<Bill> {
    // Validate input
    CreateBillSchema.parse(input);

    // Verify proposer exists
    const proposer = await this.db.users.getById(input.proposerId);
    if (!proposer) {
      throw new Error("Proposer does not exist");
    }

    return this.db.bills.create(input);
  }

  async getBillById(id: string): Promise<Bill | null> {
    return this.db.bills.getById(id);
  }

  async getAllBills(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    bills: Bill[];
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const result = await this.db.bills.getAll(page, limit);
    const hasNext = page * limit < result.total;
    const hasPrev = page > 1;
    return { ...result, hasNext, hasPrev };
  }

  async getBillsByProposer(proposerId: string): Promise<Bill[]> {
    return this.db.bills.getByProposerId(proposerId);
  }

  async updateBillStatus(id: string, status: BillStatus): Promise<Bill | null> {
    return this.db.bills.updateStatus(id, status);
  }
}
