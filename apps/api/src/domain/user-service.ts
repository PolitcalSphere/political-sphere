import { User, CreateUserInput, CreateUserSchema } from '@political-sphere/shared';
import { getDatabase } from '../stores';

export class UserService {
  private db = getDatabase();

  async createUser(input: CreateUserInput): Promise<User> {
    // Validate input
    CreateUserSchema.parse(input);

    // Check if username or email already exists
    const [byUsername, byEmail] = await Promise.all([
      this.db.users.getByUsername(input.username),
      this.db.users.getByEmail(input.email),
    ]);
    const existingUser = byUsername || byEmail;
    if (existingUser) {
      throw new Error('Username or email already exists');
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
