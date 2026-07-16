import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { HttpError } from "./utils/http-error.js";
import { authRouter, legacyAuthRouter } from "./routes/auth.routes.js";
import { searchRouter } from "./routes/search.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { carsRouter } from "./routes/cars.routes.js";
import healthRouter from "./routes/health.routes.js";
import modelsRouter from "./routes/models.routes.js";
import socialRouter from "./routes/social.routes.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // ─── CORS ─────────────────────────────────────────────────────────────────
  // CORS must be registered BEFORE all routes so OPTIONS preflight requests
  // are handled correctly. The allowed origins are read from the Railway
  // CORS_ORIGINS environment variable (comma-separated).
  //
  // Railway variable to set:
  //   CORS_ORIGINS=https://revreview.co.za,https://www.revreview.co.za,https://client-deployment-xi.vercel.app

  const allowedOrigins = new Set([
    ...env.corsOrigins,
    // Hard-coded fallbacks so the API never locks itself out even if the
    // env variable is misconfigured
    "https://revreview.co.za",
    "https://www.revreview.co.za",
    "https://client-deployment-xi.vercel.app",
  ]);

  const corsOptions = {
    origin(origin, callback) {
      // Allow server-to-server requests (no origin header) and listed origins
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(
        new HttpError(403, `Origin ${origin} is not allowed by CORS policy.`),
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    // Tell browsers they can cache the preflight response for 10 minutes
    maxAge: 600,
  };

  // Apply CORS middleware globally — this handles all routes including preflight
  app.use(cors(corsOptions));

  // Explicitly handle OPTIONS preflight for every route so browsers never
  // get a 404 or 401 on the preflight before the real request
  app.options("*", cors(corsOptions));

  // ─── Other middleware ──────────────────────────────────────────────────────

  app.use(
    rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(compression());
  app.use(hpp());
  app.use(cookieParser());
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: false, limit: "10kb" }));

  // ─── Root ──────────────────────────────────────────────────────────────────

  app.get("/", (_req, res) => {
    res.json({
      service: "revreview-node-api",
      message: "Use /health for status and /api for application routes.",
    });
  });

  // ─── Route mounts ──────────────────────────────────────────────────────────

  app.use("/health",      healthRouter);
  app.use("/api/models",  modelsRouter);
  app.use("/api/cars",    carsRouter);
  app.use("/api/auth",    authRouter);
  app.use("/api/login",   legacyAuthRouter);   // legacy compat
  app.use("/api/search",  searchRouter);        // guest + auth vehicle search
  app.use("/api/admin",   adminRouter);         // admin management dashboard
  app.use("/auth",        socialRouter);        // OAuth social callbacks

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
