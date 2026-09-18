import { database } from "../config/database.js";

export class HealthService {
  async check(): Promise<{ serverTime: Date }> {
    const result = await database.query<{ current_time: Date }>(
      "SELECT NOW() AS current_time",
    );
    const row = result.rows[0];
    if (!row) throw new Error("Banco não retornou o horário atual.");
    return { serverTime: row.current_time };
  }
}

export const healthService = new HealthService();
