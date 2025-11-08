import {
  type CreatePartyInput,
  CreatePartySchema,
  type Party,
} from "@political-sphere/shared";
import { getDatabase } from "../modules/stores/index.js";

export class PartyService {
  // Lazy getter to avoid holding a stale DB connection across test lifecycle boundaries
  private get db() {
    return getDatabase();
  }

  async createParty(input: CreatePartyInput): Promise<Party> {
    // Validate input
    CreatePartySchema.parse(input);

    // Check if party name already exists
    const existingParty = await this.db.parties.getByName(input.name);
    if (existingParty) {
      throw new Error("Party name already exists");
    }

    return this.db.parties.create(input);
  }

  async getPartyById(id: string): Promise<Party | null> {
    return this.db.parties.getById(id);
  }

  async getPartyByName(name: string): Promise<Party | null> {
    return this.db.parties.getByName(name);
  }

  async getAllParties(): Promise<Party[]> {
    const result = await this.db.parties.getAll();
    return result.parties;
  }
}
