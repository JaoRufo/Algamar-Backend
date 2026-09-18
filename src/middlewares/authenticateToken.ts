import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

type TokenPayload = { sub: string; email: string };

export function authenticateToken(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const header = request.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    response
      .status(401)
      .json({ success: false, message: "Token de autenticação obrigatório." });
    return;
  }
  try {
    const payload = jwt.verify(token, env.auth.jwtSecret) as TokenPayload;
    if (!payload.sub || !payload.email) throw new Error("Token inválido");
    request.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    response
      .status(401)
      .json({ success: false, message: "Token inválido ou expirado." });
  }
}
