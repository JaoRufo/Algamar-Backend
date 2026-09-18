import { app } from "./app.js";
import {
  database,
  initializeDatabase,
  testDatabaseConnection,
} from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./logger/logger.js";

async function startServer(): Promise<void> {
  logger.info("========================================");
  logger.info("🌊 ALGAMAR API");
  logger.info("========================================");

  logger.info(
    {
      environment: env.nodeEnv,
      port: env.port,
      logLevel: env.logLevel,
    },
    "SERVER CONFIGURATION",
  );

  try {
    await testDatabaseConnection();
    await initializeDatabase();

    const server = app.listen(env.port, "0.0.0.0", () => {
      logger.info(
        {
          url: `http://localhost:${env.port}`,
          health: `http://localhost:${env.port}/api/health`,
        },
        "SERVER STARTED",
      );

      logger.info("========================================");
      logger.info("🌊 ALGAMAR ONLINE");
      logger.info("========================================");
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(
        {
          signal,
        },
        "SERVER SHUTDOWN STARTED",
      );

      server.close(async () => {
        try {
          await database.end();

          logger.info("DATABASE POOL CLOSED");
          logger.info("SERVER SHUTDOWN COMPLETED");

          process.exit(0);
        } catch (error) {
          logger.error(
            {
              error,
            },
            "SERVER SHUTDOWN ERROR",
          );

          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    logger.fatal(
      {
        error,
      },
      "SERVER STARTUP FAILED",
    );

    process.exit(1);
  }
}

void startServer();
