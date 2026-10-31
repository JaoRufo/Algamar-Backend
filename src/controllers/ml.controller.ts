import { Request, Response } from "express";
import {
  MlApiError,
  mlPredictionService,
  QueryFilters,
} from "../services/mlPrediction.service.js";

const REGIONS = ["Litoral Norte", "Baixada Santista", "Litoral Sul"];
const SPECIES = ["Dinophysis", "Pseudo-nitzschia"];
const RISK_LEVELS = ["BAIXO", "MODERADO", "ALTO"];

type QueryOptions = Record<string, string | undefined>;

function queryValue(request: Request, name: string): string | undefined {
  const value = request.query[name];
  if (Array.isArray(value) || typeof value !== "string") return undefined;
  return value.trim() || undefined;
}

function queryOptions(request: Request, names: string[]): QueryOptions {
  return Object.fromEntries(names.map((name) => [name, queryValue(request, name)]));
}

function integerQuery(
  request: Request,
  name: string,
  min?: number,
  max?: number,
): string | undefined {
  const value = queryValue(request, name);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || (min !== undefined && number < min) || (max !== undefined && number > max)) {
    throw new Error(`O parâmetro ${name} é inválido.`);
  }
  return value;
}

function enumQuery(request: Request, name: string, values: string[]): string | undefined {
  const value = queryValue(request, name);
  if (value === undefined) return undefined;
  if (!values.includes(value)) throw new Error(`O parâmetro ${name} é inválido.`);
  return value;
}

async function proxyGet(
  request: Request,
  response: Response,
  path: string,
  query: QueryOptions = {},
): Promise<void> {
  try {
    const data = await mlPredictionService.getResource(path, query);
    response.status(200).json(data);
  } catch (error) {
    const status = error instanceof MlApiError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode
      : 503;
    response.status(status).json({
      success: false,
      message: status === 503 ? "Serviço de Machine Learning indisponível." : "Parâmetros rejeitados pela API de Machine Learning.",
    });
  }
}

export async function mlRoot(request: Request, response: Response): Promise<void> {
  await proxyGet(request, response, "/");
}

export async function mlHealth(request: Request, response: Response): Promise<void> {
  await proxyGet(request, response, "/health", {});
}

export async function marineData(request: Request, response: Response): Promise<void> {
  try { await proxyGet(request, response, "/marine-data", { limit: integerQuery(request, "limit", 1) }); }
  catch (error) { response.status(400).json({ success: false, message: error instanceof Error ? error.message : "Parâmetro inválido." }); }
}

export async function climatologia(request: Request, response: Response): Promise<void> {
  try {
    const latitude = queryValue(request, "latitude");
    const longitude = queryValue(request, "longitude");
    if (latitude === undefined || longitude === undefined || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) throw new Error("Latitude e longitude são obrigatórias.");
    await proxyGet(request, response, "/climatologia", { latitude, longitude });
  } catch (error) { response.status(400).json({ success: false, message: error instanceof Error ? error.message : "Parâmetro inválido." }); }
}

export async function predictions(request: Request, response: Response): Promise<void> {
  try { await proxyGet(request, response, "/predictions", { limit: integerQuery(request, "limit", 1), horizon: integerQuery(request, "horizon", 1, 12) }); }
  catch (error) { response.status(400).json({ success: false, message: error instanceof Error ? error.message : "Parâmetro inválido." }); }
}

export async function forecast(request: Request, response: Response): Promise<void> {
  try {
    const latitude = queryValue(request, "latitude");
    const longitude = queryValue(request, "longitude");
    if (latitude === undefined || longitude === undefined || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) throw new Error("Latitude e longitude são obrigatórias.");
    await proxyGet(request, response, "/forecast", { latitude, longitude });
  } catch (error) { response.status(400).json({ success: false, message: error instanceof Error ? error.message : "Parâmetro inválido." }); }
}

export async function forecastWindow(request: Request, response: Response): Promise<void> {
  try { await proxyGet(request, response, "/forecast/janela", { data: queryValue(request, "data"), meses: integerQuery(request, "meses", 1, 12) }); }
  catch (error) { response.status(400).json({ success: false, message: error instanceof Error ? error.message : "Parâmetro inválido." }); }
}

export async function forecastMeta(request: Request, response: Response): Promise<void> { await proxyGet(request, response, "/forecast/meta"); }
export async function forecastRegions(request: Request, response: Response): Promise<void> { await proxyGet(request, response, "/forecast/regioes"); }

export async function forecastMap(request: Request, response: Response): Promise<void> {
  try { await proxyGet(request, response, "/forecast/mapa", { target_date: queryValue(request, "target_date"), nivel_minimo: enumQuery(request, "nivel_minimo", RISK_LEVELS) }); }
  catch (error) { response.status(400).json({ success: false, message: error instanceof Error ? error.message : "Parâmetro inválido." }); }
}

export async function observed(request: Request, response: Response): Promise<void> { await proxyGet(request, response, "/observado", { mes: queryValue(request, "mes") }); }
export async function environmentalConditions(request: Request, response: Response): Promise<void> { await proxyGet(request, response, "/condicoes-ambientais", queryOptions(request, ["region", "meses_passados", "meses"])); }

export async function favorableConditions(request: Request, response: Response): Promise<void> {
  try { await proxyGet(request, response, "/condicoes-propicias", { especie: enumQuery(request, "especie", SPECIES), region: enumQuery(request, "region", REGIONS) }); }
  catch (error) { response.status(400).json({ success: false, message: error instanceof Error ? error.message : "Parâmetro inválido." }); }
}

export async function favorableConditionsHistory(request: Request, response: Response): Promise<void> {
  try { await proxyGet(request, response, "/condicoes-propicias/historico", { meses: integerQuery(request, "meses", 1) }); }
  catch (error) { response.status(400).json({ success: false, message: error instanceof Error ? error.message : "Parâmetro inválido." }); }
}

export async function testMonths(request: Request, response: Response): Promise<void> { await proxyGet(request, response, "/teste/meses"); }
export async function hindcast(request: Request, response: Response): Promise<void> { await proxyGet(request, response, "/teste/hindcast", queryOptions(request, ["emissao", "versao"])); }

export async function predict(request: Request, response: Response): Promise<void> {
  try {
    if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) throw new Error("O corpo da requisição deve ser um objeto JSON.");
    response.status(200).json(await mlPredictionService.predict(request.body));
  } catch (error) {
    const status = error instanceof MlApiError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 503;
    response.status(status).json({ success: false, message: status === 503 ? "Serviço de Machine Learning indisponível." : "Parâmetros rejeitados pela API de Machine Learning." });
  }
}

export async function coastalRisks(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const filters = parseFilters(request);
    const result = await mlPredictionService.getCoastalRisks(filters);
    const allPoints = result.history;
    const trendMap = new Map<
      string,
      {
        year: number;
        month: number;
        probability: number;
        temperature: number;
        temperatureCount: number;
        highRisk: number;
        count: number;
      }
    >();
    for (const point of allPoints) {
      const key = `${point.year}-${point.month}`;
      const trend = trendMap.get(key) ?? {
        year: point.year,
        month: point.month,
        probability: 0,
        temperature: 0,
        temperatureCount: 0,
        highRisk: 0,
        count: 0,
      };
      trend.probability += point.probability;
      trend.count += 1;
      const temperature = point.environmental_factors.temperature_celsius;
      if (temperature !== null) {
        trend.temperature += temperature;
        trend.temperatureCount += 1;
      }
      if (point.risk_level === "ALTO") trend.highRisk += 1;
      trendMap.set(key, trend);
    }
    const points = result.points;
    response
      .status(200)
      .json({
        success: true,
        summary: {
          total_monitored: points.length,
          high_risk_count: points.filter((point) => point.risk_level === "ALTO")
            .length,
          general_status: points.some((point) => point.risk_level === "ALTO")
            ? "ATENÇÃO"
            : "NORMAL",
        },
        trends: [...trendMap.values()]
          .sort((a, b) => a.year - b.year || a.month - b.month)
          .map((trend) => ({
            year: trend.year,
            month: trend.month,
            avg_probability: Number(
              (trend.probability / trend.count).toFixed(4),
            ),
            avg_temperature: trend.temperatureCount
              ? Number((trend.temperature / trend.temperatureCount).toFixed(2))
              : null,
            high_risk_points: trend.highRisk,
          })),
        filters_applied: {
          region: filters.region ?? "todas",
          risk_level: filters.riskLevel ?? "todos",
          month: filters.month ?? "todos",
        },
        stale: result.stale,
        data: points,
      });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao carregar os riscos costeiros.";
    response
      .status(message.includes("month") ? 400 : 500)
      .json({
        success: false,
        message: message.includes("month")
          ? "Parâmetro de filtro inválido."
          : "Erro ao carregar os riscos costeiros.",
        errorDetails: message,
      });
  }
}

function parseFilters(request: Request): QueryFilters {
  const region =
    typeof request.query.region === "string"
      ? request.query.region.trim()
      : undefined;
  const riskLevel =
    typeof request.query.risk_level === "string"
      ? request.query.risk_level.trim().toUpperCase()
      : undefined;
  const month =
    typeof request.query.month === "string"
      ? Number(request.query.month)
      : undefined;
  if (
    month !== undefined &&
    (!Number.isInteger(month) || month < 1 || month > 12)
  )
    throw new Error(
      "O parâmetro month deve ser um número inteiro entre 1 e 12.",
    );
  return {
    region: region || undefined,
    riskLevel: riskLevel || undefined,
    month,
  };
}
