/**
 * RevReview Domain Service API Routes
 *
 * Unified API endpoints that leverage the RevReviewDomainService for:
 * - User authentication (register, login, logout)
 * - Vehicle searches with auto-correct
 * - Vehicle data retrieval (brands, models, specs)
 * - Supabase table integration
 */

import express from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { revReviewDomainService } from "../services/revReviewDomain.service.js";

const router = express.Router();

/**
 * AUTHENTICATION ROUTES
 */

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

/**
 * POST /api/domain/auth/register
 * Register a new user with Supabase
 */
router.post(
  "/auth/register",
  validate(registerSchema, "body"),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await revReviewDomainService.registerUser(email, password);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  }),
);

/**
 * POST /api/domain/auth/login
 * Login user and create session
 */
router.post(
  "/auth/login",
  validate(loginSchema, "body"),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await revReviewDomainService.loginUser(email, password);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  }),
);

/**
 * POST /api/domain/auth/logout
 * Logout user and invalidate session
 */
router.post(
  "/auth/logout",
  asyncHandler(async (req, res) => {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        message: "Session token required",
      });
    }

    revReviewDomainService.logoutUser(sessionToken);

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }),
);

/**
 * GET /api/domain/auth/verify
 * Verify session token
 */
router.get(
  "/auth/verify",
  asyncHandler(async (req, res) => {
    const { sessionToken } = req.query;

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Session token required",
      });
    }

    const isValid = revReviewDomainService.verifySessionToken(sessionToken);
    const user = isValid
      ? revReviewDomainService.getCurrentUser(sessionToken)
      : null;

    res.status(200).json({
      success: true,
      valid: isValid,
      user,
    });
  }),
);

/**
 * GET /api/domain/auth/user
 * Get current user from session
 */
router.get(
  "/auth/user",
  asyncHandler(async (req, res) => {
    const { sessionToken } = req.query;

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: "Session token required",
      });
    }

    const user = revReviewDomainService.getCurrentUser(sessionToken);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  }),
);

/**
 * VEHICLE DATA ROUTES
 */

const searchSchema = z.object({
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * GET /api/domain/vehicles/brands
 * Get all brands or search brands
 */
router.get(
  "/vehicles/brands",
  validate(searchSchema, "query"),
  asyncHandler(async (req, res) => {
    const brands = await revReviewDomainService.getBrands(req.query.q);

    // Track search for authenticated users only
    const { sessionToken } = req.query;
    if (sessionToken && req.query.q) {
      revReviewDomainService.trackUserSearch(
        sessionToken,
        `brand:${req.query.q}`,
        brands.length,
      );
    }

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands,
    });
  }),
);

/**
 * GET /api/domain/vehicles/brands/:id
 * Get brand by ID
 */
router.get(
  "/vehicles/brands/:id",
  validate(idSchema, "params"),
  asyncHandler(async (req, res) => {
    const brand = await revReviewDomainService.getBrandById(req.params.id);

    res.status(200).json({
      success: true,
      data: brand,
    });
  }),
);

/**
 * GET /api/domain/vehicles/models
 * Get all models or search models
 */
router.get(
  "/vehicles/models",
  validate(searchSchema, "query"),
  asyncHandler(async (req, res) => {
    const models = await revReviewDomainService.getModels(req.query.q);

    // Track search for authenticated users only
    const { sessionToken } = req.query;
    if (sessionToken && req.query.q) {
      revReviewDomainService.trackUserSearch(
        sessionToken,
        `model:${req.query.q}`,
        models.length,
      );
    }

    res.status(200).json({
      success: true,
      count: models.length,
      data: models,
    });
  }),
);

/**
 * GET /api/domain/vehicles/models/:id
 * Get model by ID
 */
router.get(
  "/vehicles/models/:id",
  validate(idSchema, "params"),
  asyncHandler(async (req, res) => {
    const model = await revReviewDomainService.getModelById(req.params.id);

    res.status(200).json({
      success: true,
      data: model,
    });
  }),
);

/**
 * GET /api/domain/vehicles/search
 * Advanced search across brands, models, and specifications
 */
router.get(
  "/vehicles/search",
  validate(searchSchema, "query"),
  asyncHandler(async (req, res) => {
    const results = await revReviewDomainService.searchVehicles(req.query.q);

    // Track search for authenticated users only
    const { sessionToken } = req.query;
    if (sessionToken) {
      revReviewDomainService.trackUserSearch(
        sessionToken,
        req.query.q,
        results.totalResults,
      );
    }

    res.status(200).json({
      success: true,
      query: results.query,
      totalResults: results.totalResults,
      data: results,
    });
  }),
);

/**
 * GET /api/domain/vehicles/by-brand-model
 * Get vehicle by brand and model names
 */
router.get(
  "/vehicles/by-brand-model",
  validate(
    z.object({
      brand: z.string().trim().min(1),
      model: z.string().trim().min(1),
    }),
    "query",
  ),
  asyncHandler(async (req, res) => {
    const vehicle = await revReviewDomainService.getVehicleByBrandAndModel(
      req.query.brand,
      req.query.model,
    );

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  }),
);

/**
 * GET /api/domain/vehicles/brand/:brandId
 * Get all vehicles by brand ID
 */
router.get(
  "/vehicles/brand/:brandId",
  validate(idSchema, "params"),
  asyncHandler(async (req, res) => {
    const vehicles = await revReviewDomainService.getVehiclesByBrand(
      req.params.brandId,
    );

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  }),
);

/**
 * VEHICLE SPECIFICATIONS ROUTES
 */

/**
 * GET /api/domain/specs/dimensions
 * Get all vehicle dimensions
 */
router.get(
  "/specs/dimensions",
  asyncHandler(async (req, res) => {
    const dimensions = await revReviewDomainService.getDimensions();

    res.status(200).json({
      success: true,
      count: dimensions.length,
      data: dimensions,
    });
  }),
);

/**
 * GET /api/domain/specs/dimensions/:id
 * Get dimensions by ID
 */
router.get(
  "/specs/dimensions/:id",
  validate(idSchema, "params"),
  asyncHandler(async (req, res) => {
    const dimension = await revReviewDomainService.getDimensionById(
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: dimension,
    });
  }),
);

/**
 * GET /api/domain/specs/performance
 * Get all engine performance records
 */
router.get(
  "/specs/performance",
  asyncHandler(async (req, res) => {
    const performance = await revReviewDomainService.getEnginePerformance();

    res.status(200).json({
      success: true,
      count: performance.length,
      data: performance,
    });
  }),
);

/**
 * GET /api/domain/specs/performance/:id
 * Get engine performance by ID
 */
router.get(
  "/specs/performance/:id",
  validate(idSchema, "params"),
  asyncHandler(async (req, res) => {
    const performance = await revReviewDomainService.getEnginePerformanceById(
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: performance,
    });
  }),
);

/**
 * GET /api/domain/specs/prices
 * Get all vehicle prices
 */
router.get(
  "/specs/prices",
  asyncHandler(async (req, res) => {
    const prices = await revReviewDomainService.getPrices();

    res.status(200).json({
      success: true,
      count: prices.length,
      data: prices,
    });
  }),
);

/**
 * GET /api/domain/specs/prices/:modelId
 * Get price by model ID
 */
router.get(
  "/specs/prices/:modelId",
  validate(idSchema, "params"),
  asyncHandler(async (req, res) => {
    const price = await revReviewDomainService.getPriceByModelId(
      req.params.modelId,
    );

    res.status(200).json({
      success: true,
      data: price,
    });
  }),
);

/**
 * SUPABASE INTEGRATION ROUTES
 */

/**
 * GET /api/domain/supabase/acquired
 * Get acquired vehicles from Supabase
 */
router.get(
  "/supabase/acquired",
  validate(
    z.object({
      limit: z.coerce.number().int().min(1).max(500).optional(),
    }),
    "query",
  ),
  asyncHandler(async (req, res) => {
    const acquired = await revReviewDomainService.getAcquiredVehicles(
      req.query.limit,
    );

    res.status(200).json({
      success: true,
      ...acquired,
    });
  }),
);

/**
 * GET /api/domain/supabase/table/:tableName
 * Get data from any Supabase table with user context
 */
router.get(
  "/supabase/table/:tableName",
  validate(
    z.object({
      tableName: z.string().trim().min(1),
      limit: z.coerce.number().int().min(1).max(500).optional(),
    }),
    "query",
  ),
  asyncHandler(async (req, res) => {
    const tableData = await revReviewDomainService.getSupabaseTableData(
      req.params.tableName,
      req.query.limit,
    );

    res.status(200).json({
      success: true,
      ...tableData,
    });
  }),
);

/**
 * HEALTH & STATUS ROUTES
 */

/**
 * GET /api/domain/health
 * Get domain service health status
 */
router.get(
  "/health",
  asyncHandler(async (req, res) => {
    const health = await revReviewDomainService.getHealthStatus();

    res.status(health.healthy ? 200 : 503).json({
      success: health.healthy,
      ...health,
    });
  }),
);

/**
 * SEARCH TRACKING ROUTES
 */

/**
 * GET /api/domain/searches/history
 * Get search history for authenticated user
 */
router.get(
  "/searches/history",
  asyncHandler(async (req, res) => {
    const { sessionToken } = req.query;

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: "Session token required",
      });
    }

    const history = revReviewDomainService.getUserSearchHistory(sessionToken);

    if (history === null) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  }),
);

/**
 * GET /api/domain/searches/stats
 * Get search statistics for authenticated user
 */
router.get(
  "/searches/stats",
  asyncHandler(async (req, res) => {
    const { sessionToken } = req.query;

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: "Session token required",
      });
    }

    const stats = revReviewDomainService.getUserSearchStats(sessionToken);

    if (stats === null) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    res.status(200).json({
      success: true,
      data: stats,
    });
  }),
);

/**
 * DELETE /api/domain/searches/history
 * Clear search history for authenticated user
 */
router.delete(
  "/searches/history",
  asyncHandler(async (req, res) => {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: "Session token required",
      });
    }

    const cleared = revReviewDomainService.clearUserSearchHistory(sessionToken);

    if (!cleared) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    res.status(200).json({
      success: true,
      message: "Search history cleared",
    });
  }),
);

/**
 * GET /api/domain/admin/analytics
 * Get search analytics (admin endpoint - all users)
 */
router.get(
  "/admin/analytics",
  asyncHandler(async (req, res) => {
    const analytics = revReviewDomainService.getSearchAnalytics();

    res.status(200).json({
      success: true,
      data: analytics,
    });
  }),
);

export default router;
