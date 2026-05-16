import express from "express";
//import { executeQuery, getDatabaseHealth } from "../config/database.js";
import { getSupabaseHealth } from "../config/supabase.js";

const router = express.Router();

/*router.get("/", async (req, res) => {
  const health = await getDatabaseHealth();
  const statusCode = health.connected ? 200 : 503;
  res.status(statusCode).json({
    service: "revreview-node-api",
    ...health,
  });
});*/

router.get("/supabase", async (req, res) => {
  const health = await getSupabaseHealth();
  const statusCode = health.connected ? 200 : 503;

  res.status(statusCode).json({
    service: "revreview-node-api",
    source: "supabase",
    ...health,
  });
});

/*router.get("/db-test", async (req, res) => {
  try {
    const result = await executeQuery((request) =>
      request.query("SELECT 1 AS test"),
    );

    res.json({
      success: true,
      result: result.recordset,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.get("/cars-test", async (req, res) => {
  try {
    const result = await executeQuery((request) =>
      request.query("SELECT TOP 5 * FROM Cars"),
    );

    res.json({
      success: true,
      rows: result.recordset,
      count: result.recordset.length,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});*/

export default router;
