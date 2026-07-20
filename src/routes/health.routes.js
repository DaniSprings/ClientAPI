import express from "express";
import { getDatabaseHealth, getReadSupabase } from "../config/database.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const health = await getDatabaseHealth();
  const statusCode = health.connected ? 200 : 503;
  res.status(statusCode).json({
    service: "revreview-node-api",
    ...health,
  });
});

router.get("/db-test", async (req, res) => {
  try {
    const db = getReadSupabase();
    let data = null;
    let error = null;

    ({ data, error } = await db.from("brandtable").select("Brand_ID, BrandNames").limit(1));
    if (error) {
      throw error;
    }

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      result: data,
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
    const db = getReadSupabase();
    let data = null;
    let error = null;

    ({ data, error } = await db
      .from("vehicle_view")
      .select("brand, model, price, power")
      .limit(5));

    if (error) {
      ({ data, error } = await db
        .from("modeltable")
        .select("MODEL_ID, ModelNames, Brand_ID, BodyShape, brandtable!inner(BrandNames)")
        .limit(5));
    }

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      rows: data,
      count: data.length,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
