import dotenv from "dotenv";

dotenv.config();

const splitList = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  corsOrigins: splitList(process.env.CORS_ORIGINS, [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]),
  
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseSchema: process.env.SUPABASE_SCHEMA || "public",
  supabaseAcquiredTable: process.env.SUPABASE_ACQUIRED_TABLE || "BrandTable",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 100),
  allowDevSocialLogin: process.env.ALLOW_DEV_SOCIAL_LOGIN === "true",
};

export const isProduction = env.nodeEnv === "production";

export const isDatabaseConfigured = () => {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
};
