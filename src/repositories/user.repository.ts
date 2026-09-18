import { database } from "../config/database.js";
import { PublicUser, User } from "../entities/user.entity.js";

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  created_at: Date;
};

function mapUser(row: UserRow): User {
  return {
    id: String(row.id),
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const result = await database.query<UserRow>(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const result = await database.query<UserRow>(
      "SELECT id, full_name, email, password_hash, created_at FROM users WHERE id = $1",
      [id],
    );
    if (!result.rows[0]) return null;
    const user = mapUser(result.rows[0]);
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }

  async create(
    fullName: string,
    email: string,
    passwordHash: string,
  ): Promise<PublicUser> {
    const result = await database.query<UserRow>(
      "INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, password_hash, created_at",
      [fullName, email, passwordHash],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Não foi possível criar o usuário.");
    const user = mapUser(row);
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }
}

export const userRepository = new UserRepository();
