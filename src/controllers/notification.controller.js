import * as notificationService from "../services/in-app-notification.service.js";
import {
  notificationIdSchema,
  notificationQuerySchema,
} from "../validation/notification.validation.js";
import { errorResponse, successResponse } from "../utils/response.js";

export async function getNotifications(req, res, next) {
  try {
    const filters = notificationQuerySchema.parse(req.query);
    return successResponse(
      res,
      200,
      "Notifications fetched successfully.",
      await notificationService.listNotifications(req.user, filters),
    );
  } catch (error) {
    return next(error);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    return successResponse(
      res,
      200,
      "Unread notification count fetched successfully.",
      await notificationService.getUnreadCount(req.user),
    );
  } catch (error) {
    return next(error);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const id = notificationIdSchema.parse(req.params.id);
    const notification = await notificationService.markNotificationRead(
      id,
      req.user,
    );
    return notification
      ? successResponse(
          res,
          200,
          "Notification marked as read.",
          notification,
        )
      : errorResponse(res, 404, "Notification not found.");
  } catch (error) {
    return next(error);
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    return successResponse(
      res,
      200,
      "All notifications marked as read.",
      await notificationService.markAllNotificationsRead(req.user),
    );
  } catch (error) {
    return next(error);
  }
}

export async function removeNotification(req, res, next) {
  try {
    const id = notificationIdSchema.parse(req.params.id);
    const deleted = await notificationService.deleteNotification(id, req.user);
    return deleted
      ? successResponse(res, 200, "Notification deleted successfully.", {
          id,
          deleted: true,
        })
      : errorResponse(res, 404, "Notification not found.");
  } catch (error) {
    return next(error);
  }
}
