import dotenv from "dotenv";

dotenv.config();

const isPlaceholderSecret = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized || normalized.startsWith("replace-with-");
};

const splitList = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value).trim().toLowerCase() === "true";
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  corsOrigins: splitList(process.env.CORS_ORIGINS, [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]),
  corsAllowVercelPreviews: toBoolean(process.env.CORS_ALLOW_VERCEL_PREVIEWS, true),
  corsAllowedVercelProjects: splitList(
    process.env.CORS_ALLOWED_VERCEL_PROJECTS,
    ["clientdeployment", "client-deployment"],
  ),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 100),
  allowDevSocialLogin: process.env.ALLOW_DEV_SOCIAL_LOGIN === "true",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure:
    process.env.SMTP_SECURE === "true" ||
    (!process.env.SMTP_SECURE && Number(process.env.SMTP_PORT || 587) === 465),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  resendApiKey: process.env.RESEND_API_KEY || process.env.SMTP_PASS || "",
  smtpFrom:
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    "",
};

export const isProduction = env.nodeEnv === "production";

export const isReadDatabaseConfigured = () =>
  Boolean(env.supabaseUrl && env.supabaseAnonKey);

export const isDatabaseConfigured = () =>
  Boolean(env.supabaseUrl && !isPlaceholderSecret(env.supabaseServiceRoleKey));

export const isEmailConfigured = () =>
  Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass && env.smtpFrom);
