import { Router } from "express";
import {
  createDesign,
  deleteDesign,
  getDesign,
  getDesigns,
  updateDesign,
} from "../controllers/design.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyToken);
router.get("/", getDesigns);
router.post("/", createDesign);
router.get("/:id", getDesign);
router.put("/:id", updateDesign);
router.delete("/:id", deleteDesign);

export default router;
