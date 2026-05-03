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
  dbServer: process.env.DB_SERVER || "",
  dbPort: Number(process.env.DB_PORT || 1433),
  dbName: process.env.DB_NAME || "",
  dbUser: process.env.DB_USER || "",
  dbPassword: process.env.DB_PASSWORD || "",
  dbUseWindowsAuth: process.env.DB_USE_WINDOWS_AUTH === "true",
  dbEncrypt: process.env.DB_ENCRYPT !== "false",
  dbTrustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
  jwtSecret: process.env.JWT_SECRET || "replace-me-before-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "2h",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 100),
  allowDevSocialLogin: process.env.ALLOW_DEV_SOCIAL_LOGIN === "true",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseSchema: process.env.SUPABASE_SCHEMA || "public",
  supabaseAcquiredTable: process.env.SUPABASE_ACQUIRED_TABLE || "BrandTable",
};

export const isProduction = env.nodeEnv === "production";

export const isDatabaseConfigured = () => {
  if (env.dbUseWindowsAuth) {
    return Boolean(env.dbServer && env.dbName);
  }

  return Boolean(env.dbServer && env.dbName && env.dbUser && env.dbPassword);
};

export const isSupabaseConfigured = () =>
  Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
