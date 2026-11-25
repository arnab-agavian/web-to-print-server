import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { prisma } from "./config/db.js";
import { swaggerSpec } from "./config/swagger.js";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import addressRoutes from "./routes/address.routes.js";
import templateRoutes from "./routes/template.routes.js";
import designRoutes from "./routes/design.routes.js";
import fileRoutes from "./routes/file.routes.js";
import orderRoutes from "./routes/order.routes.js";
import proofRoutes from "./routes/proof.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import userActivityRoutes from "./routes/user-activity.routes.js";
import { notFound } from "./middlewares/notFound.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { jsonReplacer, sendSuccess } from "./utils/response.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", env.trustProxy);
app.set("json replacer", jsonReplacer);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.origins.includes(origin)) return callback(null, true);
      const error = new Error("Origin not allowed by CORS.");
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "2mb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 180,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

app.get("/api/docs.json", (req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  return res.json(swaggerSpec);
});
app.use(
  "/api/docs",
  (req, res, next) => {
    res.removeHeader("Content-Security-Policy");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Digital Heroes API Docs",
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.get("/", (req, res) =>
  sendSuccess(res, 200, "Digital Heroes backend is running.", {
    service: "Digital Heroes API",
  }),
);
app.get("/api/health", (req, res) =>
  sendSuccess(res, 200, "API health fetched successfully.", {
    status: "ok",
    database: env.hasDatabase ? "prisma/supabase" : "demo",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }),
);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/proofs", proofRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/user-activities", userActivityRoutes);
app.use("/api/admin", adminRoutes);
app.use(notFound);
app.use(errorHandler);

let server;
if (env.nodeEnv !== "test")
  server = app.listen(env.port, () =>
    console.log(
      `Digital Heroes API running on port ${env.port} (${env.hasDatabase ? "Prisma + Supabase" : "demo mode"})`,
    ),
  );
async function shutdown(signal) {
  console.log(`${signal} received. Closing server...`);
  server?.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
export default app;
