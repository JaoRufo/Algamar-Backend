import { NextFunction, Request, Response } from "express";

import { logger } from "../logger/logger.js";

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

  response.status(500).json({
    success: false,
    message: "Erro interno do servidor.",
  });
}
