import { Request, Response } from "express";
import { authService } from "../services/auth.service.js";

export async function register(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const { full_name, fullName, email, password } = request.body as Record<
      string,
      unknown
    >;
    const result = await authService.register(
      String(full_name ?? fullName ?? ""),
      String(email ?? ""),
      String(password ?? ""),
    );
    response.status(201).json({ success: true, ...result });
  } catch (error) {
    handleAuthError(error, response);
  }
}

export async function login(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const { email, password } = request.body as Record<string, unknown>;
    const result = await authService.login(
      String(email ?? ""),
      String(password ?? ""),
    );
    response.status(200).json({ success: true, ...result });
  } catch (error) {
    handleAuthError(error, response);
  }
}

export async function updateMe(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const userId = request.user?.id;
    if (!userId) {
      response
        .status(401)
        .json({ success: false, message: "Não autenticado." });
      return;
    }
    const { full_name, fullName, email, password } = request.body as Record<
      string,
      unknown
    >;
    const result = await authService.update(
      userId,
      full_name === undefined && fullName === undefined
        ? undefined
        : String(full_name ?? fullName),
      email === undefined ? undefined : String(email),
      password === undefined ? undefined : String(password),
    );
    response.status(200).json({ success: true, ...result });
  } catch (error) {
    handleAuthError(error, response);
  }
}

export async function removeMe(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const userId = request.user?.id;
    if (!userId) {
      response
        .status(401)
        .json({ success: false, message: "Não autenticado." });
      return;
    }
    await authService.remove(userId);
    response.status(204).send();
  } catch (error) {
    handleAuthError(error, response);
  }
}

function handleAuthError(error: unknown, response: Response): void {
  const message =
    error instanceof Error ? error.message : "Erro de autenticação.";
  const status =
    error instanceof Error && error.name === "ConflictError"
      ? 409
      : error instanceof Error && error.name === "NotFoundError"
        ? 404
        : error instanceof Error && error.name === "UnauthorizedError"
          ? 401
          : 400;
  response.status(status).json({ success: false, message });
}
