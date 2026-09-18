import http from "http";
import { database } from "../config/database.js";
import { env } from "../config/env.js";
import { EnrichedPoint } from "../entities/prediction.entity.js";

type JsonRecord = Record<string, unknown>;
export type QueryFilters = {
  region?: string;
  riskLevel?: string;
  month?: number;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const valueOf = (record: JsonRecord, ...keys: string[]): unknown =>
  keys
    .map((key) => record[key])
    .find((value) => value !== undefined && value !== null);
const numberOf = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};
const textOf = (value: unknown, fallback = ""): string =>
  typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback;
const itemsOf = (payload: unknown, key: string): JsonRecord[] =>
  (Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload[key])
      ? payload[key]
      : []
  ).filter(isRecord);

function periodOf(record: JsonRecord): { year: number; month: number } {
  const dateValue = valueOf(record, "date", "timestamp", "datetime");
  const date = typeof dateValue === "string" ? new Date(dateValue) : null;
  const now = new Date();
  return {
    year:
      numberOf(valueOf(record, "year", "ano")) ??
      (date && !Number.isNaN(date.getTime())
        ? date.getUTCFullYear()
        : now.getUTCFullYear()),
    month:
      numberOf(valueOf(record, "month", "mes")) ??
      (date && !Number.isNaN(date.getTime())
        ? date.getUTCMonth() + 1
        : now.getUTCMonth() + 1),
  };
}
function coordinatesOf(
  record: JsonRecord,
): { latitude: number; longitude: number } | null {
  const latitude = numberOf(valueOf(record, "latitude", "lat", "latitud"));
  const longitude = numberOf(
    valueOf(record, "longitude", "lon", "lng", "long"),
  );
  return latitude === null || longitude === null
    ? null
    : { latitude, longitude };
}
function classifyRegion(latitude: number, longitude: number): string {
  if (latitude >= -23.85 || (latitude >= -24.05 && longitude >= -46.15))
    return "Litoral Norte";
  if (latitude >= -24.35) return "Baixada Santista";
  return "Litoral Sul";
}
function riskOf(value: unknown, probability: number): string {
  const text = textOf(value).trim().toUpperCase();
  if (text.includes("ALTO") || text.includes("HIGH")) return "ALTO";
  if (text.includes("MED") || text.includes("MODERATE")) return "MÉDIO";
  if (text.includes("BAIX") || text.includes("LOW")) return "BAIXO";
  return probability >= 0.7 ? "ALTO" : probability >= 0.4 ? "MÉDIO" : "BAIXO";
}
function environmentalOf(record: JsonRecord): JsonRecord {
  const factors = valueOf(
    record,
    "environmental_factors",
    "environmentalFactors",
  );
  return isRecord(factors) ? factors : record;
}
function enrich(
  predictions: JsonRecord[],
  marineData: JsonRecord[],
): EnrichedPoint[] {
  const marineByKey = new Map<string, JsonRecord>();
  for (const marine of marineData) {
    const coordinates = coordinatesOf(marine);
    if (!coordinates) continue;
    const period = periodOf(marine);
    marineByKey.set(
      `${coordinates.latitude.toFixed(4)}:${coordinates.longitude.toFixed(4)}:${period.year}:${period.month}`,
      marine,
    );
  }
  return predictions.flatMap((prediction, index) => {
    const coordinates = coordinatesOf(prediction);
    if (!coordinates) return [];
    const period = periodOf(prediction);
    const marine = marineByKey.get(
      `${coordinates.latitude.toFixed(4)}:${coordinates.longitude.toFixed(4)}:${period.year}:${period.month}`,
    );
    const environmental = environmentalOf(marine ?? {});
    const probability =
      numberOf(
        valueOf(
          prediction,
          "probability",
          "risk_probability",
          "predicted_probability",
          "probabilidade",
        ),
      ) ?? 0;
    return [
      {
        id: textOf(
          valueOf(prediction, "id", "prediction_id"),
          `${coordinates.latitude}:${coordinates.longitude}:${period.year}:${period.month}:${index}`,
        ),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        region: classifyRegion(coordinates.latitude, coordinates.longitude),
        year: period.year,
        month: period.month,
        probability,
        risk_level: riskOf(
          valueOf(prediction, "risk_level", "riskLevel", "level", "risk"),
          probability,
        ),
        environmental_factors: {
          temperature_celsius: numberOf(
            valueOf(
              environmental,
              "temperature_celsius",
              "temperature",
              "temp",
              "temperatura",
            ),
          ),
          chlorophyll_mg_m3: numberOf(
            valueOf(
              environmental,
              "chlorophyll_mg_m3",
              "chlorophyll",
              "chl_a",
              "clorofila",
            ),
          ),
          salinity_psu: numberOf(
            valueOf(environmental, "salinity_psu", "salinity", "salinidade"),
          ),
        },
        model_version: textOf(
          valueOf(prediction, "model_version", "modelVersion", "version"),
          "v1.0",
        ),
      },
    ];
  });
}
function filterPoints(
  points: EnrichedPoint[],
  filters: QueryFilters,
): EnrichedPoint[] {
  return points.filter(
    (point) =>
      (!filters.region ||
        point.region.toLowerCase() === filters.region.toLowerCase()) &&
      (!filters.riskLevel || point.risk_level === filters.riskLevel) &&
      (filters.month === undefined || point.month === filters.month),
  );
}
function fetchPythonApi(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let data = "";
      response.on("data", (chunk) => {
        data += chunk;
      });
      response.on("end", () => {
        try {
          if (
            response.statusCode &&
            response.statusCode >= 200 &&
            response.statusCode < 300
          )
            resolve(JSON.parse(data));
          else
            reject(
              new Error(`API Python retornou status ${response.statusCode}`),
            );
        } catch {
          reject(new Error("A API Python retornou JSON inválido."));
        }
      });
    });
    request.setTimeout(10000, () =>
      request.destroy(new Error("Timeout ao consultar a API Python.")),
    );
    request.on("error", reject);
  });
}
async function persist(points: EnrichedPoint[]): Promise<string> {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const batch = await client.query<{ id: string }>(
      "INSERT INTO prediction_batches (model_version) VALUES ($1) RETURNING id",
      [points[0]?.model_version ?? "v1.0"],
    );
    const batchRow = batch.rows[0];
    if (!batchRow)
      throw new Error("Não foi possível criar o lote de predições.");
    for (const point of points)
      await client.query(
        "INSERT INTO predictions (batch_id, external_id, latitude, longitude, region, prediction_year, prediction_month, probability, risk_level, temperature_celsius, chlorophyll_mg_m3, salinity_psu, model_version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
        [
          batchRow.id,
          point.id,
          point.latitude,
          point.longitude,
          point.region,
          point.year,
          point.month,
          point.probability,
          point.risk_level,
          point.environmental_factors.temperature_celsius,
          point.environmental_factors.chlorophyll_mg_m3,
          point.environmental_factors.salinity_psu,
          point.model_version,
        ],
      );
    await client.query("COMMIT");
    return String(batchRow.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function historical(): Promise<EnrichedPoint[]> {
  const result = await database.query(
    "SELECT external_id, latitude, longitude, region, prediction_year, prediction_month, probability, risk_level, temperature_celsius, chlorophyll_mg_m3, salinity_psu, model_version FROM predictions ORDER BY created_at ASC",
  );
  return result.rows.map((row) => ({
    id: String(row.external_id),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    region: row.region,
    year: row.prediction_year,
    month: row.prediction_month,
    probability: Number(row.probability),
    risk_level: row.risk_level,
    environmental_factors: {
      temperature_celsius:
        row.temperature_celsius === null
          ? null
          : Number(row.temperature_celsius),
      chlorophyll_mg_m3:
        row.chlorophyll_mg_m3 === null ? null : Number(row.chlorophyll_mg_m3),
      salinity_psu: row.salinity_psu === null ? null : Number(row.salinity_psu),
    },
    model_version: row.model_version,
  }));
}

export class MlPredictionService {
  async getCoastalRisks(
    filters: QueryFilters,
  ): Promise<{
    points: EnrichedPoint[];
    history: EnrichedPoint[];
    batchId: string;
  }> {
    const apiBaseUrl = env.ml.apiUrl.replace(/\/$/, "");
    const [predictionPayload, marinePayload] = await Promise.all([
      fetchPythonApi(`${apiBaseUrl}/predictions?limit=100`),
      fetchPythonApi(`${apiBaseUrl}/marine-data?limit=100`),
    ]);
    const predictions = itemsOf(predictionPayload, "predictions");
    const marine = itemsOf(marinePayload, "marine_data").length
      ? itemsOf(marinePayload, "marine_data")
      : itemsOf(marinePayload, "data");
    if (!predictions.length)
      throw new Error("A API Python não retornou predições válidas.");
    const points = enrich(predictions, marine);
    const batchId = await persist(points);
    return {
      points: filterPoints(points, filters),
      history: filterPoints(await historical(), filters),
      batchId,
    };
  }
}

export const mlPredictionService = new MlPredictionService();
