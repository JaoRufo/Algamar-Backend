import { Pool } from "pg";

import { env } from "./env.js";
import { logger } from "../logger/logger.js";

export const database = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

database.on("connect", () => {
  logger.info(
    {
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
    },
    "DATABASE CONNECTION",
  );
});

database.on("error", (error) => {
  logger.error(
    {
      error,
    },
    "DATABASE ERROR",
  );
});

database.on("remove", () => {
  logger.debug("DATABASE CLIENT REMOVED");
});

export async function testDatabaseConnection(): Promise<void> {
  const startTime = process.hrtime.bigint();

  logger.info(
    {
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      user: env.database.user,
    },
    "DATABASE CONNECTING",
  );

  const client = await database.connect();

  try {
    await client.query("SELECT NOW()");

    const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;

    logger.info(
      {
        durationMs: Number(duration.toFixed(2)),
      },
      "DATABASE CONNECTED",
    );
  } finally {
    client.release();
  }
}
