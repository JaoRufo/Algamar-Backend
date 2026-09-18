import { NextFunction, Request, Response } from "express";

import { logger } from "../logger/logger.js";

type RequestBodyError = Error & {
  type?: string;
  status?: number;
};

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
): void {
  logger.error(
    {
      method: request.method,
      url: request.originalUrl,
      error,
    },
    "ERROR",
  );

  if (response.headersSent) {
    return;
  }

  const requestError = error as RequestBodyError;
  if (requestError.type === "entity.parse.failed") {
    response.status(400).json({
      success: false,
      message: "JSON inválido no corpo da requisição.",
      errorDetails: "Envie um objeto JSON válido com uma única chave externa.",
    });
    return;
  }

  response.status(500).json({
    success: false,
    message: "Erro interno do servidor.",
  });
}
