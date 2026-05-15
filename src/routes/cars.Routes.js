import express from "express";

import { z } from "zod";
import { carsController } from "../controllers/cars.controllers.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = express.Router();

const searchSchema = z.object({
  q: z.string().trim().min(1).optional(),
  brand: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  year: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

router.get("/brands", asyncHandler(carsController.getBrands));

router.get(
  "/brands/search",
  validate(searchSchema, "query"),
  asyncHandler(carsController.searchBrands),
);

router.get(
  "/brands/autocorrect",
  validate(searchSchema, "query"),
  asyncHandler(carsController.getBrandAutoCorrect),
);

router.get(
  "/models",
  validate(searchSchema, "query"),
  asyncHandler(carsController.getModels),
);

router.get(
  "/models/search",
  validate(searchSchema, "query"),
  asyncHandler(carsController.searchModels),
);

router.get(
  "/models/autocorrect",
  validate(searchSchema, "query"),
  asyncHandler(carsController.getModelAutoCorrect),
);

router.get(
  "/years",
  validate(searchSchema, "query"),
  asyncHandler(carsController.getYears),
);

router.get(
  "/details",
  validate(searchSchema, "query"),
  asyncHandler(carsController.getDetails),
);

router.get(
  "/all",
  validate(searchSchema, "query"),
  asyncHandler(carsController.getAllVehicles),
);

router.get(
  "/acquired",
  validate(searchSchema, "query"),
  asyncHandler(carsController.getAcquiredData),
);

router.get(
  "/supabase/table/:tableName",
  validate(searchSchema, "query"),
  asyncHandler(carsController.getSupabaseTableData),
);

export default router;
