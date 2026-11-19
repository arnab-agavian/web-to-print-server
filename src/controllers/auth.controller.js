import authService from "../services/auth.service.js";
import {
  loginSchema,
  refreshSchema,
  signupSchema,
} from "../validation/auth.validation.js";
import { successResponse } from "../utils/response.js";

export async function signup(req, res, next) {
  try {
    const data = await authService.signup(signupSchema.parse(req.body));
    return successResponse(res, 201, "Account created successfully.", data);
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const data = await authService.login(loginSchema.parse(req.body));
    return successResponse(res, 200, "Logged in successfully.", data);
  } catch (error) {
    return next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const data = await authService.refresh(refreshToken);
    return successResponse(res, 200, "Session refreshed successfully.", data);
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const data = await authService.logout(req.authToken);
    return successResponse(res, 200, "Logged out successfully.", data);
  } catch (error) {
    return next(error);
  }
}

export function me(req, res) {
  return successResponse(res, 200, "Current user fetched successfully.", {
    user: req.user,
  });
}
