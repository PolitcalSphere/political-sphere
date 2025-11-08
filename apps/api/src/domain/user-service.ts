import {
  type CreateUserInput,
  CreateUserSchema,
  type User,
} from "@political-sphere/shared";
import { getDatabase } from "../modules/stores/index.js";

export class UserService {
  // Use a lazy getter so the service always obtains the current database connection.
  // This avoids holding a stale/closed DatabaseConnection across test lifecycle boundaries.
  private get db() {
    return getDatabase();
  }

  async createUser(input: CreateUserInput): Promise<User> {
    // Validate input
    CreateUserSchema.parse(input);

    // Debug logging removed — use structured logging via shared logger for production
    // Check if username or email already exists
    const [byUsername, byEmail] = await Promise.all([
      this.db.users.getByUsername(input.username),
      this.db.users.getByEmail(input.email),
    ]);
    const existingUser = byUsername || byEmail;
    // existingUser check performed; details available via store/cache logs
    if (existingUser) {
      throw new Error("Username or email already exists");
    }

    return this.db.users.create(input);
  }

  async getUserById(id: string): Promise<User | null> {
    return this.db.users.getById(id);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.db.users.getByUsername(username);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.db.users.getByEmail(email);
  }
}
