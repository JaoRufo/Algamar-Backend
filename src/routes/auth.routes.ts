import { Router } from "express";
import {
  login,
  register,
  removeMe,
  updateMe,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middlewares/authenticateToken.js";

const router = Router();
router.post("/register", register);
router.post("/login", login);
router.put("/me", authenticateToken, updateMe);
router.delete("/me", authenticateToken, removeMe);
export default router;
