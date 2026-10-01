import http from "http";
import https from "https";
import { createHash } from "crypto";
import { database } from "../config/database.js";
import { env } from "../config/env.js";
import { EnrichedPoint } from "../entities/prediction.entity.js";

type JsonRecord = Record<string, unknown>;
export type QueryFilters = {
  region?: string;
  riskLevel?: string;
  month?: number;
};

const normalizeRegion = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[ _-]+/g, " ");

function canonicalRegion(value: string): string {
  const normalized = normalizeRegion(value);
  if (normalized === "norte" || normalized === "north")
    return "litoral norte";
  if (normalized === "santista" || normalized === "baixada")
    return "baixada santista";
  if (normalized === "sul" || normalized === "south") return "litoral sul";
  return normalized;
}

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
        canonicalRegion(point.region) === canonicalRegion(filters.region)) &&
      (!filters.riskLevel || point.risk_level === filters.riskLevel) &&
      (filters.month === undefined || point.month === filters.month),
  );
}
function fetchPythonApi(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transport = new URL(url).protocol === "https:" ? https : http;
    const request = transport.get(url, (response) => {
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

function postPythonApi(url: string, payload: JsonRecord): Promise<JsonRecord> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === "https:" ? https : http;
    const body = JSON.stringify(payload);
    const request = transport.request(
      parsedUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (
              response.statusCode &&
              response.statusCode >= 200 &&
              response.statusCode < 300 &&
              isRecord(parsed)
            )
              resolve(parsed);
            else reject(new Error(`API Python retornou status ${response.statusCode}`));
          } catch {
            reject(new Error("A API Python retornou JSON inválido."));
          }
        });
      },
    );
    request.setTimeout(10000, () =>
      request.destroy(new Error("Timeout ao consultar a API Python.")),
    );
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

type MarinePoint = {
  latitude: number;
  longitude: number;
  year: number;
  month: number;
  chlorophyll: number | null;
  chlorophyllMax: number | null;
  temperature: number | null;
  salinity: number | null;
};

function marinePointOf(record: JsonRecord): MarinePoint | null {
  const coordinates = coordinatesOf(record);
  if (!coordinates) return null;
  const period = periodOf(record);
  const factors = environmentalOf(record);
  return {
    ...coordinates,
    ...period,
    chlorophyll: numberOf(
      valueOf(factors, "chlorophyll_mg_m3", "chlorophyll", "chl_a", "clorofila"),
    ),
    chlorophyllMax: numberOf(
      valueOf(
        factors,
        "chlorophyll_max_mg_m3",
        "chlorophyll_max",
        "clorofila_maxima",
      ),
    ),
    temperature: numberOf(
      valueOf(factors, "temperature_celsius", "temperature", "temp", "temperatura"),
    ),
    salinity: numberOf(valueOf(factors, "salinity_psu", "salinity", "salinidade")),
  };
}

function coordinateKey(point: MarinePoint): string {
  return `${point.latitude.toFixed(4)}:${point.longitude.toFixed(4)}`;
}

function average(values: Array<number | null>): number {
  const valid = values.filter((value): value is number => value !== null);
  return valid.length
    ? valid.reduce((sum, value) => sum + value, 0) / valid.length
    : 0;
}

function predictionFeatures(point: MarinePoint, series: MarinePoint[]): JsonRecord {
  const sameCoordinate = series
    .filter((candidate) => coordinateKey(candidate) === coordinateKey(point))
    .sort((first, second) => first.year - second.year || first.month - second.month);
  const previousYear = sameCoordinate.find(
    (candidate) =>
      candidate.year === point.year - 1 && candidate.month === point.month,
  );
  const historicalMonth = sameCoordinate.filter(
    (candidate) => candidate.month === point.month,
  );
  const previous36 = sameCoordinate
    .filter(
      (candidate) =>
        candidate.year < point.year ||
        (candidate.year === point.year && candidate.month <= point.month),
    )
    .slice(-36);
  const hotspots: Array<[number, number]> = [
    [-23.98, -46.35],
    [-23.45, -45.75],
  ];
  const distHotspot = Math.min(
    ...hotspots.map(([latitude, longitude]) =>
      Math.sqrt(
        (point.latitude - latitude) ** 2 + (point.longitude - longitude) ** 2,
      ),
    ),
  );
  return {
    mes: point.month,
    latitude: point.latitude,
    longitude: point.longitude,
    dist_hotspot: distHotspot,
    clorofila_media_ano_anterior: previousYear?.chlorophyll ?? 0,
    clorofila_maxima_ano_anterior:
      previousYear?.chlorophyllMax ?? previousYear?.chlorophyll ?? 0,
    temperatura_ano_anterior: previousYear?.temperature ?? 0,
    salinidade_ano_anterior: previousYear?.salinity ?? 0,
    clorofila_media_historica_mes: average(
      historicalMonth.map((candidate) => candidate.chlorophyll),
    ),
    salinidade_media_historica_mes: average(
      historicalMonth.map((candidate) => candidate.salinity),
    ),
    clorofila_media_3anos: average(
      previous36.map((candidate) => candidate.chlorophyll),
    ),
    salinidade_media_3anos: average(
      previous36.map((candidate) => candidate.salinity),
    ),
  };
}

async function predictFromMarineData(
  marineData: JsonRecord[],
): Promise<EnrichedPoint[]> {
  const series = marineData
    .map(marinePointOf)
    .filter((point): point is MarinePoint => point !== null);
  const targetYear = Math.max(...series.map((point) => point.year));
  const targets = series.filter((point) => point.year === targetYear);
  const predictions = await Promise.all(
    targets.map(async (point, index) => {
      const result = await postPythonApi(
        `${env.ml.apiUrl.replace(/\/$/, "")}/predict`,
        predictionFeatures(point, series),
      );
      const probability = numberOf(result.probability) ?? 0;
      return {
        id: `${point.latitude}:${point.longitude}:${point.year}:${point.month}:${index}`,
        latitude: point.latitude,
        longitude: point.longitude,
        region: classifyRegion(point.latitude, point.longitude),
        year: point.year,
        month: point.month,
        probability,
        risk_level: riskOf(result.risk ?? result.risk_level, probability),
        environmental_factors: {
          temperature_celsius: point.temperature,
          chlorophyll_mg_m3: point.chlorophyll,
          salinity_psu: point.salinity,
        },
        model_version: textOf(result.model_version, "v1.0"),
      } satisfies EnrichedPoint;
    }),
  );
  return predictions;
}
function getSourceHash(points: EnrichedPoint[]): string {
  const stablePoints = [...points].sort((first, second) =>
    first.id.localeCompare(second.id),
  );
  return createHash("sha256")
    .update(JSON.stringify(stablePoints))
    .digest("hex");
}
async function persist(points: EnrichedPoint[]): Promise<string> {
  const sourceHash = getSourceHash(points);
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const batch = await client.query<{ id: string }>(
      "INSERT INTO prediction_batches (model_version, source_hash) VALUES ($1, $2) ON CONFLICT (source_hash) WHERE source_hash IS NOT NULL DO NOTHING RETURNING id",
      [points[0]?.model_version ?? "v1.0", sourceHash],
    );
    let batchRow = batch.rows[0];
    if (!batchRow) {
      const existingBatch = await client.query<{ id: string }>(
        "SELECT id FROM prediction_batches WHERE source_hash = $1",
        [sourceHash],
      );
      batchRow = existingBatch.rows[0];
    }
    if (!batchRow)
      throw new Error("Não foi possível criar o lote de predições.");
    if (batch.rows[0]) {
      const values: unknown[] = [];
      const rows = points.map((point, index) => {
        const offset = index * 13;
        values.push(
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
        );
        return `(${Array.from({ length: 13 }, (_, valueIndex) => `$${offset + valueIndex + 1}`).join(",")})`;
      });
      await client.query(
        `INSERT INTO predictions (batch_id, external_id, latitude, longitude, region, prediction_year, prediction_month, probability, risk_level, temperature_celsius, chlorophyll_mg_m3, salinity_psu, model_version) VALUES ${rows.join(",")}`,
        values,
      );
    }
    await client.query(
      "DELETE FROM prediction_batches WHERE created_at < NOW() - ($1 * INTERVAL '1 day') OR id NOT IN (SELECT id FROM prediction_batches ORDER BY created_at DESC LIMIT $2)",
      [env.ml.historyRetentionDays, env.ml.maxHistoryBatches],
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
async function historical(filters: QueryFilters): Promise<EnrichedPoint[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.region) {
    values.push(canonicalRegion(filters.region));
    conditions.push(`LOWER(region) = LOWER($${values.length})`);
  }
  if (filters.riskLevel) {
    values.push(filters.riskLevel);
    conditions.push(`risk_level = $${values.length}`);
  }
  if (filters.month !== undefined) {
    values.push(filters.month);
    conditions.push(`prediction_month = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await database.query(
    `SELECT external_id, latitude, longitude, region, prediction_year, prediction_month, probability, risk_level, temperature_celsius, chlorophyll_mg_m3, salinity_psu, model_version FROM predictions ${where} ORDER BY created_at ASC`,
    values,
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
  async getCoastalRisks(filters: QueryFilters): Promise<{
    points: EnrichedPoint[];
    history: EnrichedPoint[];
    batchId: string;
  }> {
    const apiBaseUrl = env.ml.apiUrl.replace(/\/$/, "");
    const marinePayload = await fetchPythonApi(
      `${apiBaseUrl}/marine-data?limit=${encodeURIComponent(env.ml.apiLimit)}`,
    );
    const marine = itemsOf(marinePayload, "marine_data").length
      ? itemsOf(marinePayload, "marine_data")
      : itemsOf(marinePayload, "data");
    if (!marine.length)
      throw new Error("A API Python não retornou dados ambientais válidos.");
    const points = await predictFromMarineData(marine);
    if (!points.length)
      throw new Error("Não foi possível gerar predições para os dados ambientais.");
    const batchId = await persist(points);
    return {
      points: filterPoints(points, filters),
      history: await historical(filters),
      batchId,
    };
  }
}

export const mlPredictionService = new MlPredictionService();
