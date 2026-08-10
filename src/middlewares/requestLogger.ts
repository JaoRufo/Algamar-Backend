import { randomUUID } from "node:crypto";

import { NextFunction, Request, Response } from "express";

import { logger } from "../logger/logger.js";

export function requestLogger(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestId = randomUUID();
  const startTime = process.hrtime.bigint();

  response.setHeader("X-Request-ID", requestId);

  logger.info(
    {
      requestId,
      method: request.method,
      url: request.originalUrl,
      ip: request.ip,
    },
    "REQUEST",
  );

  response.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;

    logger.info(
      {
        requestId,
        method: request.method,
        url: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Number(duration.toFixed(2)),
      },
      "RESPONSE",
    );
  });

  next();
}
