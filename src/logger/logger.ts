import pino from "pino";

import { env } from "../config/env.js";

export const logger = pino({
  level: env.logLevel,

  transport:
    env.nodeEnv !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
            singleLine: false,
          },
        }
      : undefined,

  base: {
    service: "algamar-api",
  },
});
