import { Request, Response } from "express";
import {
  mlPredictionService,
  QueryFilters,
} from "../services/mlPrediction.service.js";

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
