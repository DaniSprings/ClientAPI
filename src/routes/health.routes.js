import express from "express";
import { getDatabaseHealth, getReadSupabase } from "../config/database.js";

const router = express.Router();

// Liveness check — Railway's healthcheck should point here.
// Must be instant and never depend on external services.
router.get("/", (req, res) => {
  res.status(200).json({
    service: "revreview-node-api",
    status: "ok",
  });
});

// Readiness/diagnostics — checks DB connectivity, for your own monitoring.
// Not used by Railway's healthcheck.
router.get("/db", async (req, res) => {
  const health = await withTimeout(getDatabaseHealth(), 5000);
  const statusCode = health?.connected ? 200 : 503;
  res.status(statusCode).json({
    service: "revreview-node-api",
    ...(health || { connected: false, message: "Health check timed out" }),
  });
});

router.get("/db-test", async (req, res) => {
  try {
    const db = getReadSupabase();
    const { data, error } = await withTimeout(
      db.from("brandtable").select("Brand_ID, BrandNames").limit(1),
      5000,
    );
    if (error) throw error;

    res.json({ success: true, result: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/cars-test", async (req, res) => {
  try {
    const db = getReadSupabase();
    let { data, error } = await withTimeout(
      db.from("modeltable").select("MODEL_ID, ModelNames, Brand_ID, BodyShape, brandtable!inner(BrandNames)").limit(5),
      5000,
    );
    if (error) throw error;

    res.json({ success: true, rows: data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) =>
      setTimeout(() => resolve(null), ms),
    ),
  ]);
}

export default router;