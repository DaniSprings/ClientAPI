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
import carsRouter from "./routes/cars.routes.js";
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

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(
          new HttpError(403, `Origin ${origin} is not allowed by CORS policy.`),
        );
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

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

  app.get("/", (_req, res) => {
    res.json({
      service: "revreview-node-api",
      message: "Use /health for status and /api for application routes.",
    });
  });

  // ─── Route mounts ──────────────────────────────────────────────────────────
  app.use("/health",        healthRouter);
  app.use("/api/models",    modelsRouter);
  app.use("/api/cars",      carsRouter);
  app.use("/api/auth",      authRouter);
  app.use("/api/login",     legacyAuthRouter);   // legacy compat
  app.use("/api/search",    searchRouter);        // ← NEW: guest + auth vehicle search
  app.use("/api/admin",     adminRouter);         // ← NEW: admin management dashboard
  app.use("/auth",          socialRouter);        // OAuth social callbacks

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
