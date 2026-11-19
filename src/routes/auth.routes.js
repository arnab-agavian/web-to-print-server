import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  logout,
  me,
  refresh,
  signup,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { sendError } from "../utils/response.js";

const router = Router();
const credentialLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) =>
    sendError(res, 429, "Too many authentication attempts. Try again later."),
});

router.post("/signup", credentialLimiter, signup);
router.post("/login", credentialLimiter, login);
router.post("/refresh", credentialLimiter, refresh);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, me);

export default router;
