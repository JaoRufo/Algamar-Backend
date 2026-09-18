import { Request, Response } from "express";
import { healthService } from "../services/health.service.js";

export async function health(
  _request: Request,
  response: Response,
): Promise<void> {
  try {
    const result = await healthService.check();
    response
      .status(200)
      .json({
        success: true,
        system: "Algamar",
        status: "online",
        database: { status: "online", serverTime: result.serverTime },
      });
  } catch {
    response
      .status(503)
      .json({
        success: false,
        system: "Algamar",
        status: "degraded",
        database: { status: "offline" },
      });
  }
}
