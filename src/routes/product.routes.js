import { Router } from "express";
import {
  calculateProductPrice,
  createProduct,
  getProduct,
  getProducts,
  updateProduct,
} from "../controllers/product.controller.js";
import {
  createTemplate,
  getProductTemplates,
} from "../controllers/template.controller.js";
import { requireRole, verifyToken } from "../middlewares/auth.middleware.js";
const router = Router();
router.get("/", getProducts);
router.post("/", verifyToken, requireRole("admin"), createProduct);
router.post("/price", calculateProductPrice);
router.get("/:slug/templates", getProductTemplates);
router.post(
  "/:slug/templates",
  verifyToken,
  requireRole("admin"),
  createTemplate,
);
router.get("/:slug", getProduct);
router.put("/:slug", verifyToken, requireRole("admin"), updateProduct);
export default router;
