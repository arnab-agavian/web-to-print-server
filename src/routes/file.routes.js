import { Router } from "express";
import {
  deleteFile,
  refreshSignedUrl,
  uploadFile,
} from "../controllers/file.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { parseSingleUpload } from "../middlewares/upload.middleware.js";

const router = Router();
router.delete("/", verifyToken, deleteFile);
router.post("/upload", verifyToken, parseSingleUpload, uploadFile);
router.post("/signed-url", verifyToken, refreshSignedUrl);

export default router;
