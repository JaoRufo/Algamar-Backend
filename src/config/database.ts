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

export async function initializeDatabase(): Promise<void> {
  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(320) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prediction_batches (
      id BIGSERIAL PRIMARY KEY,
      source VARCHAR(50) NOT NULL DEFAULT 'machine-learning',
      model_version VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id BIGSERIAL PRIMARY KEY,
      batch_id BIGINT NOT NULL REFERENCES prediction_batches(id) ON DELETE CASCADE,
      external_id VARCHAR(255),
      latitude NUMERIC(10, 6) NOT NULL,
      longitude NUMERIC(10, 6) NOT NULL,
      region VARCHAR(100) NOT NULL,
      prediction_year INTEGER NOT NULL,
      prediction_month INTEGER NOT NULL CHECK (prediction_month BETWEEN 1 AND 12),
      probability NUMERIC(8, 6) NOT NULL,
      risk_level VARCHAR(20) NOT NULL,
      temperature_celsius NUMERIC(8, 3),
      chlorophyll_mg_m3 NUMERIC(10, 4),
      salinity_psu NUMERIC(8, 3),
      model_version VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS predictions_period_idx
      ON predictions (prediction_year, prediction_month);
    CREATE INDEX IF NOT EXISTS predictions_risk_idx
      ON predictions (risk_level);
    CREATE INDEX IF NOT EXISTS predictions_region_idx
      ON predictions (region);
  `);
}
