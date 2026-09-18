import dotenv from "dotenv";

dotenv.config();

function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] ?? defaultValue;

  if (value === undefined || value === "") {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: getEnv("NODE_ENV", "development"),

  port: Number(getEnv("PORT", "3000")),

  logLevel: getEnv("LOG_LEVEL", "info"),

  database: {
    host: getEnv("DB_HOST", "localhost"),
    port: Number(getEnv("DB_PORT", "5432")),
    name: getEnv("DB_NAME", "algamar"),
    user: getEnv("DB_USER", "postgres"),
    password: getEnv("DB_PASSWORD", "postgres"),
    poolMax: Number(getEnv("DB_POOL_MAX", "5")),
  },

  ml: {
    apiUrl: getEnv("ML_API_URL", "http://127.0.0.1:8000"),
    historyRetentionDays: Number(getEnv("ML_HISTORY_RETENTION_DAYS", "90")),
    maxHistoryBatches: Number(getEnv("ML_MAX_HISTORY_BATCHES", "1000")),
  },

  auth: {
    jwtSecret: getEnv("JWT_SECRET", "change-this-secret-in-production"),
    tokenExpiresIn: getEnv("JWT_EXPIRES_IN", "1d"),
  },
};
