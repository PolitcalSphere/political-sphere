import { Bill, CreateBillInput, CreateBillSchema, BillStatus } from '@political-sphere/shared';
import { getDatabase } from '../stores';

export class BillService {
  private db = getDatabase();

  async proposeBill(input: CreateBillInput): Promise<Bill> {
    // Validate input
    CreateBillSchema.parse(input);

    // Verify proposer exists
    const proposer = await this.db.users.getById(input.proposerId);
    if (!proposer) {
      throw new Error('Proposer does not exist');
    }

    return this.db.bills.create(input);
  }

  async getBillById(id: string): Promise<Bill | null> {
    return this.db.bills.getById(id);
  }

  async getAllBills(): Promise<Bill[]> {
    const result = await this.db.bills.getAll();
    return result.bills;
  }

  async getBillsByProposer(proposerId: string): Promise<Bill[]> {
    return this.db.bills.getByProposerId(proposerId);
  }

  async updateBillStatus(id: string, status: BillStatus): Promise<Bill | null> {
    return this.db.bills.updateStatus(id, status);
  }
}
