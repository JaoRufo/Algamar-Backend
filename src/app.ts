import cors from "cors";
import express from "express";

import { errorHandler } from "./middlewares/errorHandler.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import routes from "./routes/index.js";
import { logger } from "./logger/logger.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);

app.get("/", (_request, response) => {
  response.status(200).json({
    success: true,
    system: "Algamar",
    message: "API do Algamar está online na porta " + process.env.PORT + ".",
  });
});

app.use("/api", routes);

app.use(errorHandler);

logger.debug("Aplicação Express configurada.");
