import * as userActivityService from "../services/user-activity.service.js";
import { createUserActivitySchema } from "../validation/user-activity.validation.js";
import { successResponse } from "../utils/response.js";
import { getClientIp } from "../utils/client-ip.js";

export async function createUserActivity(req, res, next) {
  try {
    const input = createUserActivitySchema.parse(req.body);
    const activity = await userActivityService.createUserActivity(
      input,
      getClientIp(req),
    );
    return successResponse(
      res,
      201,
      "User activity recorded successfully.",
      activity,
    );
  } catch (error) {
    return next(error);
  }
}
