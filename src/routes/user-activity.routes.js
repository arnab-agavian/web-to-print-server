import { Router } from "express";
import { createUserActivity } from "../controllers/user-activity.controller.js";

const router = Router();
router.post("/", createUserActivity);

export default router;
