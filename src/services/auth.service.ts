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

  async update(
    id: string,
    fullName?: string,
    email?: string,
    password?: string,
  ): Promise<{ user: PublicUser; token: string }> {
    if (fullName === undefined && email === undefined && password === undefined)
      throw new Error("Informe ao menos um campo para atualizar.");

    const normalizedName = fullName === undefined ? null : fullName.trim();
    const normalizedEmail =
      email === undefined ? null : email.trim().toLowerCase();
    if (normalizedName !== null && !normalizedName)
      throw new Error("O nome não pode ficar vazio.");
    if (normalizedEmail !== null && !normalizedEmail)
      throw new Error("O email não pode ficar vazio.");
    if (password !== undefined && password.length < MIN_PASSWORD_LENGTH)
      throw new Error("A senha deve ter no mínimo 6 caracteres.");

    if (
      normalizedEmail &&
      (await userRepository.findByEmail(normalizedEmail))
    ) {
      const currentUser = await userRepository.findPublicById(id);
      if (!currentUser || currentUser.email !== normalizedEmail) {
        const error = new Error("Email já cadastrado.");
        error.name = "ConflictError";
        throw error;
      }
    }

    const passwordHash =
      password === undefined ? null : await bcrypt.hash(password, 12);
    const user = await userRepository.update(
      id,
      normalizedName,
      normalizedEmail,
      passwordHash,
    );
    if (!user) {
      const error = new Error("Usuário não encontrado.");
      error.name = "NotFoundError";
      throw error;
    }
    return { user, token: this.createToken(user) };
  }

  async remove(id: string): Promise<void> {
    if (!(await userRepository.delete(id))) {
      const error = new Error("Usuário não encontrado.");
      error.name = "NotFoundError";
      throw error;
    }
  }

  private createToken(user: PublicUser): string {
    return jwt.sign({ email: user.email }, env.auth.jwtSecret, {
      subject: user.id,
      expiresIn: env.auth.tokenExpiresIn as jwt.SignOptions["expiresIn"],
    });
  }
}

export const authService = new AuthService();
