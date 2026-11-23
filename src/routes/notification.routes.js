import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  removeNotification,
} from "../controllers/notification.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyToken);
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", removeNotification);

export default router;
