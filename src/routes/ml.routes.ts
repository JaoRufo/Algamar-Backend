import { Router, Request, Response } from "express";
import http from "http";
import { database } from "../config/database.js";
import { logger } from "../logger/logger.js";

const router = Router();

// Função auxiliar usando http nativo do Node para evitar conflitos do fetch com o Uvicorn
function fetchPythonApi(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`Erro na API Python: Status ${res.statusCode}`));
            }
          } catch (e) {
            reject(
              new Error(
                "Erro ao fazer parse do JSON retornado pela API Python.",
              ),
            );
          }
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

router.get("/coastal-risks", async (_request: Request, response: Response) => {
  const startTime = process.hrtime.bigint();
  const targetUrl = "http://127.0.0.1:8000/predictions?limit=100";

  try {
    logger.info(
      { targetUrl },
      "Buscando dados de floração na Machine Learning (via HTTP nativo)...",
    );

    const mlJsonResponse = await fetchPythonApi(targetUrl);
    const predictionsList = mlJsonResponse.predictions;

    if (!Array.isArray(predictionsList)) {
      throw new Error(
        "A resposta da Machine Learning não contém um array de predições válido.",
      );
    }

    const query = `
      INSERT INTO ml_predictions_batch (payload_data, created_at)
      VALUES ($1, NOW())
      RETURNING id, created_at;
    `;
    const dbResult = await database.query(query, [
      JSON.stringify(predictionsList),
    ]);

    const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    logger.info(
      { durationMs: Number(duration.toFixed(2)) },
      "Dados da costa obtidos e salvos com sucesso.",
    );

    return response.status(200).json({
      success: true,
      batchId: dbResult.rows[0].id,
      createdAt: dbResult.rows[0].created_at,
      data: predictionsList,
    });
  } catch (error: any) {
    logger.error(
      { targetUrl, errMessage: error.message, errStack: error.stack },
      "Falha ao buscar dados da costa da Machine Learning",
    );

    return response.status(500).json({
      success: false,
      message: "Erro ao carregar os riscos de floração da costa.",
      errorDetails: error.message,
    });
  }
});

export default router;
