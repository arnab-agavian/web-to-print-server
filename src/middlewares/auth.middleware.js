import { env } from "../config/env.js";
import prisma from "../config/db.js";
import { supabase, supabaseAuth } from "../../supabase/supabase.js";
import { sendError } from "../utils/response.js";

export async function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (env.demoMode && !token) {
      const isAdmin = req.headers["x-demo-role"] === "admin";
      req.authToken = null;
      req.user = {
        id: isAdmin ? "demo-admin" : "demo-customer",
        email: isAdmin
          ? env.email.admin || "admin@digitalheroes.example"
          : "maya@example.com",
        fullName: isAdmin ? "Digital Heroes Admin" : "Maya Brooks",
        role: isAdmin ? "admin" : "customer",
      };
      return next();
    }
    const authClient = supabaseAuth || supabase;
    if (!token || !authClient)
      return sendError(res, 401, "Authentication required.");
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user)
      return sendError(res, 401, "Invalid or expired session.");
    req.authToken = token;
    const profile = env.hasDatabase
      ? await prisma.profile.findUnique({
          where: { id: data.user.id },
          select: { role: true, fullName: true },
        })
      : null;
    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: profile?.role || "customer",
      fullName: profile?.fullName,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) =>
    req.user && roles.includes(req.user.role)
      ? next()
      : sendError(
          res,
          403,
          `Access denied. Required role(s): ${roles.join(", ")}.`,
        );
}
