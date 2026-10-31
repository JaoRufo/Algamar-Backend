import { Router } from "express";
import * as controller from "../controllers/ml.controller.js";

const router = Router();
const proxy = (path: string) => (request: Parameters<typeof controller.forwardMlGet>[0], response: Parameters<typeof controller.forwardMlGet>[1]) =>
  controller.forwardMlGet(request, response, path);
router.get("/", controller.mlRoot);
router.get("/health", controller.mlHealth);
router.get("/marine-data", proxy("/marine-data"));
router.get("/climatologia", controller.climatologia);
router.get("/predictions", proxy("/predictions"));
router.post("/predict", controller.predict);
router.get("/forecast/janela", proxy("/forecast/janela"));
router.get("/forecast/meta", proxy("/forecast/meta"));
router.get("/forecast/regioes", proxy("/forecast/regioes"));
router.get("/forecast/mapa", proxy("/forecast/mapa"));
router.get("/forecast", proxy("/forecast"));
router.get("/coastal-risks", proxy("/coastal-risks"));
router.get("/observado", proxy("/observado"));
router.get("/condicoes-ambientais", proxy("/condicoes-ambientais"));
router.get("/condicoes-propicias/historico", proxy("/condicoes-propicias/historico"));
router.get("/condicoes-propicias", proxy("/condicoes-propicias"));
router.get("/teste/meses", controller.testMonths);
router.get("/teste/hindcast", controller.hindcast);
export default router;
