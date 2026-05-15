/**
 * RevReview Domain Controller
 *
 * Controllers that use the RevReviewDomainService for unified business logic
 * and data access patterns. This demonstrates how to structure controllers
 * when leveraging the domain service.
 */

import { revReviewDomainService } from "../services/revReviewDomain.service.js";
import { HttpError } from "../utils/http-error.js";

/**
 * Authentication Controller
 */
export const authController = {
  /**
   * Register a new user
   * POST /register
   */
  async register(req, res) {
    const { email, password } = req.body;
    const result = await revReviewDomainService.registerUser(email, password);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  },

  /**
   * Login user
   * POST /login
   */
  async login(req, res) {
    const { email, password } = req.body;
    const result = await revReviewDomainService.loginUser(email, password);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  },

  /**
   * Logout user
   * POST /logout
   */
  async logout(req, res) {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      throw new HttpError(400, "Session token required");
    }

    revReviewDomainService.logoutUser(sessionToken);

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  },

  /**
   * Verify session token
   * GET /verify
   */
  async verifySession(req, res) {
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
  },

  /**
   * Get current user
   * GET /user
   */
  async getCurrentUser(req, res) {
    const { sessionToken } = req.query;

    if (!sessionToken) {
      throw new HttpError(401, "Session token required");
    }

    const user = revReviewDomainService.getCurrentUser(sessionToken);

    if (!user) {
      throw new HttpError(401, "Invalid or expired session");
    }

    res.status(200).json({
      success: true,
      user,
    });
  },
};

/**
 * Vehicle Controller using Domain Service
 */
export const vehicleController = {
  /**
   * Get all brands or search brands
   * GET /brands?q=search
   */
  async getBrands(req, res) {
    const brands = await revReviewDomainService.getBrands(req.query.q);

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands,
    });
  },

  /**
   * Get brand by ID
   * GET /brands/:id
   */
  async getBrandById(req, res) {
    const brand = await revReviewDomainService.getBrandById(req.params.id);

    res.status(200).json({
      success: true,
      data: brand,
    });
  },

  /**
   * Get all models or search models
   * GET /models?q=search
   */
  async getModels(req, res) {
    const models = await revReviewDomainService.getModels(req.query.q);

    res.status(200).json({
      success: true,
      count: models.length,
      data: models,
    });
  },

  /**
   * Get model by ID
   * GET /models/:id
   */
  async getModelById(req, res) {
    const model = await revReviewDomainService.getModelById(req.params.id);

    res.status(200).json({
      success: true,
      data: model,
    });
  },

  /**
   * Advanced search across all vehicle fields
   * GET /search?q=query
   */
  async searchVehicles(req, res) {
    const results = await revReviewDomainService.searchVehicles(req.query.q);

    res.status(200).json({
      success: true,
      query: results.query,
      totalResults: results.totalResults,
      data: results,
    });
  },

  /**
   * Get vehicle by brand and model
   * GET /by-brand-model?brand=BMW&model=3%20Series
   */
  async getVehicleByBrandAndModel(req, res) {
    const vehicle = await revReviewDomainService.getVehicleByBrandAndModel(
      req.query.brand,
      req.query.model,
    );

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  },

  /**
   * Get all vehicles by brand
   * GET /vehicles/brand/:brandId
   */
  async getVehiclesByBrand(req, res) {
    const vehicles = await revReviewDomainService.getVehiclesByBrand(
      req.params.brandId,
    );

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  },
};

/**
 * Specifications Controller using Domain Service
 */
export const specsController = {
  /**
   * Get all dimensions
   * GET /dimensions
   */
  async getDimensions(req, res) {
    const dimensions = await revReviewDomainService.getDimensions();

    res.status(200).json({
      success: true,
      count: dimensions.length,
      data: dimensions,
    });
  },

  /**
   * Get dimensions by ID
   * GET /dimensions/:id
   */
  async getDimensionById(req, res) {
    const dimension = await revReviewDomainService.getDimensionById(
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: dimension,
    });
  },

  /**
   * Get all engine performance records
   * GET /performance
   */
  async getEnginePerformance(req, res) {
    const performance = await revReviewDomainService.getEnginePerformance();

    res.status(200).json({
      success: true,
      count: performance.length,
      data: performance,
    });
  },

  /**
   * Get engine performance by ID
   * GET /performance/:id
   */
  async getEnginePerformanceById(req, res) {
    const performance = await revReviewDomainService.getEnginePerformanceById(
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: performance,
    });
  },

  /**
   * Get all prices
   * GET /prices
   */
  async getPrices(req, res) {
    const prices = await revReviewDomainService.getPrices();

    res.status(200).json({
      success: true,
      count: prices.length,
      data: prices,
    });
  },

  /**
   * Get price by model ID
   * GET /prices/:modelId
   */
  async getPriceByModelId(req, res) {
    const price = await revReviewDomainService.getPriceByModelId(
      req.params.modelId,
    );

    res.status(200).json({
      success: true,
      data: price,
    });
  },
};

/**
 * Supabase Integration Controller
 */
export const supabaseController = {
  /**
   * Get acquired vehicles from Supabase
   * GET /acquired
   */
  async getAcquiredVehicles(req, res) {
    const acquired = await revReviewDomainService.getAcquiredVehicles(
      req.query.limit,
    );

    res.status(200).json({
      success: true,
      ...acquired,
    });
  },

  /**
   * Get data from any Supabase table
   * GET /table/:tableName
   */
  async getTableData(req, res) {
    const tableData = await revReviewDomainService.getSupabaseTableData(
      req.params.tableName,
      req.query.limit,
    );

    res.status(200).json({
      success: true,
      ...tableData,
    });
  },

  /**
   * Get domain service health status
   * GET /health
   */
  async getHealth(req, res) {
    const health = await revReviewDomainService.getHealthStatus();

    res.status(health.healthy ? 200 : 503).json({
      success: health.healthy,
      ...health,
    });
  },
};

export default {
  authController,
  vehicleController,
  specsController,
  supabaseController,
};
