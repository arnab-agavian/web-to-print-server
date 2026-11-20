import { Router } from "express";
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../controllers/cart.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyToken);
router.get("/", getCart);
router.delete("/", clearCart);
router.post("/items", addCartItem);
router.patch("/items/:id", updateCartItem);
router.delete("/items/:id", removeCartItem);

export default router;
