import { Router } from "express";
import { uploadFile } from "../controllers/file.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { parseSingleUpload } from "../middlewares/upload.middleware.js";

const router = Router();
router.post("/upload", verifyToken, parseSingleUpload, uploadFile);

export default router;
