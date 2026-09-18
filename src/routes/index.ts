import { Router } from "express";

import mlRoutes from "./ml.routes.js";
import authRoutes from "./auth.routes.js";
import { authenticateToken } from "../middlewares/authenticateToken.js";
import { health } from "../controllers/health.controller.js";

const router = Router();

router.use("/auth", authRoutes);
router.use(authenticateToken);

router.get("/health", health);

router.use("/ml", mlRoutes);

export default router;
