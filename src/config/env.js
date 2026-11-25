import "dotenv/config";

const port = Number(process.env.PORT || 4000);

export function parseCorsOrigins(value) {
  return [
    ...new Set(
      String(value || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map((origin) => {
          try {
            return new URL(origin).origin;
          } catch {
            return origin.replace(/\/+$/, "");
          }
        }),
    ),
  ];
}

export function parseTrustProxy(value) {
  const input = String(value ?? "").trim();
  if (!input || input.toLowerCase() === "false") return false;
  if (input.toLowerCase() === "true") return true;
  if (/^\d+$/.test(input)) return Number(input);
  return input
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const env = {
  port,
  apiBaseUrl: (process.env.API_BASE_URL || `http://localhost:${port}/api`).replace(/\/$/, ""),
  nodeEnv: process.env.NODE_ENV || "development",
  demoMode: process.env.DEMO_MODE !== "false",
  hasDatabase: Boolean(process.env.DATABASE_URL),
  hasSupabaseAuth: Boolean(
    process.env.SUPABASE_URL &&
      (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY),
  ),
  storage: {
    productionBucket: process.env.SUPABASE_PRODUCTION_BUCKET || "production",
  },
  email: {
    enabled: process.env.EMAIL_ENABLED === "true",
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
    admin: process.env.ADMIN_NOTIFICATION_EMAIL,
  },
  origins: parseCorsOrigins(
    process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173"
  ),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
};
