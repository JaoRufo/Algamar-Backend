import { Router } from "express";

import { database } from "../config/database.js";
import { logger } from "../logger/logger.js";

const router = Router();

router.get("/health", async (_request, response) => {
  const startTime = process.hrtime.bigint();

  logger.debug("DATABASE QUERY: SELECT NOW()");

  try {
    const result = await database.query("SELECT NOW() AS current_time");

    const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;

    logger.debug(
      {
        durationMs: Number(duration.toFixed(2)),
      },
      "DATABASE QUERY COMPLETED",
    );

    response.status(200).json({
      success: true,
      system: "Algamar",
      status: "online",
      database: {
        status: "online",
        serverTime: result.rows[0].current_time,
      },
    });
  } catch (error) {
    logger.error(
      {
        error,
      },
      "DATABASE QUERY FAILED",
    );

    response.status(503).json({
      success: false,
      system: "Algamar",
      status: "degraded",
      database: {
        status: "offline",
      },
    });
  }
});

export default router;
