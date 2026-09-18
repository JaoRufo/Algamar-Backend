import { Router } from "express";
import { coastalRisks } from "../controllers/ml.controller.js";

const router = Router();
router.get("/coastal-risks", coastalRisks);
export default router;
