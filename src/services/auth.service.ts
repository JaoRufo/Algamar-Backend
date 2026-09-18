import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { PublicUser } from "../entities/user.entity.js";
import { userRepository } from "../repositories/user.repository.js";

const MIN_PASSWORD_LENGTH = 6;

export class AuthService {
  async register(
    fullName: string,
    email: string,
    password: string,
  ): Promise<{ user: PublicUser; token: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (
      !fullName.trim() ||
      !normalizedEmail ||
      password.length < MIN_PASSWORD_LENGTH
    )
      throw new Error(
        "Nome, email e senha com no mínimo 6 caracteres são obrigatórios.",
      );
    if (await userRepository.findByEmail(normalizedEmail)) {
      const error = new Error("Email já cadastrado.");
      error.name = "ConflictError";
      throw error;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userRepository.create(
      fullName.trim(),
      normalizedEmail,
      passwordHash,
    );
    return { user, token: this.createToken(user) };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: PublicUser; token: string }> {
    if (password.length < MIN_PASSWORD_LENGTH) {
      const error = new Error("Email ou senha inválidos.");
      error.name = "UnauthorizedError";
      throw error;
    }
    const user = await userRepository.findByEmail(email.trim().toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      const error = new Error("Email ou senha inválidos.");
      error.name = "UnauthorizedError";
      throw error;
    }
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return { user: publicUser, token: this.createToken(publicUser) };
  }

  private createToken(user: PublicUser): string {
    return jwt.sign({ email: user.email }, env.auth.jwtSecret, {
      subject: user.id,
      expiresIn: env.auth.tokenExpiresIn as jwt.SignOptions["expiresIn"],
    });
  }
}

export const authService = new AuthService();
