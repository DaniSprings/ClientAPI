import { Router } from "express";
import { z } from "zod";
import { modelsController } from "../controllers/models.controllers.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  brand: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  year: z.string().trim().min(1).optional(),
});

const vehicleDataSchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(10).default(1),
});

const batchSchema = z.array(
  z.object({
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),
    year: z.string().trim().min(1).optional(),
  }),
);

router.get("/brands/all", asyncHandler(modelsController.getAllBrands));

router.get( "/brands/with-count", asyncHandler(modelsController.getBrandsWithCount));

router.get("/ranges", asyncHandler(modelsController.getRanges));

router.get("/prices", asyncHandler(modelsController.getPrices));

router.get("/engines", asyncHandler(modelsController.getEngines));

router.get("/performance", asyncHandler(modelsController.getPerformanceList));

router.get("/model/:id", asyncHandler(modelsController.getModelById));

router.get(
  "/models/search",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.searchModels),
);

router.get(
  "/model-table/brands/search",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.searchBrands),
);

router.get(
  "/model-table/models/search",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.searchModelsByBrand),
);

router.get(
  "/model-table/models/by-brand",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.getModelsByBrand),
);

router.get("/search/brands", asyncHandler(modelsController.getAllBrands));

router.get(
  "/search/models",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.getModelsByBrand),
);

router.get(
  "/search/years",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.getYears),
);

router.get(
  "/search",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.searchVehicles),
);

router.get(
  "/models/by-brand",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.getModelsByBrand),
);

router.get(
  "/years/by-brand-model",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.getYears),
);

router.get(
  "/details",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.getDetails),
);

router.get(
  "/dimensions/:brand/:model",
  asyncHandler(modelsController.getDimensions),
);

router.get(
  "/price",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.getPrice),
);

router.get(
  "/engine",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.getEngine),
);

router.get(
  "/range",
  validate(searchQuerySchema, "query"),
  asyncHandler(modelsController.getRange),
);

router.get(
  "/carstats/:brand/:model",
  asyncHandler(modelsController.getCarStats),
);

router.get(
  "/carstats/:brand/:model/:year",
  asyncHandler(modelsController.getCarStats),
);

router.post(
  "/carstats/batch",
  validate(batchSchema),
  asyncHandler(modelsController.getCarStatsBatch),
);

router.post(
  "/vehicle-data",
  validate(vehicleDataSchema),
  asyncHandler(modelsController.getVehicleData),
);

export default router;
