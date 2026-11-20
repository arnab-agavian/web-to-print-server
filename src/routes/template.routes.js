import { Router } from "express";
import {
  deleteTemplate,
  getTemplate,
  updateTemplate,
} from "../controllers/template.controller.js";
import { requireRole, verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();
router.get("/:id", getTemplate);
router.put("/:id", verifyToken, requireRole("admin"), updateTemplate);
router.delete("/:id", verifyToken, requireRole("admin"), deleteTemplate);

export default router;
