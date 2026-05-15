/**
 * RevReview API Domain Service
 *
 * This service acts as a domain layer that bridges Supabase authentication
 * and database operations with the RevReview vehicle data API.
 *
 * Features:
 * - User authentication via Supabase
 * - Integrated search across brands, models, and vehicle data
 * - User session management
 * - Unified access to vehicle data with search capabilities
 */

import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { supabaseRepository } from "../repositories/supabase.repository.js";
import { getSupabaseClient } from "../config/supabase.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { buildAutoCorrectResult, rankSuggestions } from "../utils/search.js";

/**
 * User Session Management with Supabase
 */
const userSessions = new Map();

const createSessionToken = (userId) => {
  return `session_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Search History Tracking
 * Stores search queries for authenticated users only
 */
const searchHistory = new Map(); // userId -> [{ query, timestamp, results }]

const trackSearch = (sessionToken, query, resultCount = 0) => {
  // Only track searches for authenticated users
  if (!sessionToken || !userSessions.has(sessionToken)) {
    return false; // Do nothing for unregistered users
  }

  const user = userSessions.get(sessionToken);
  const userId = user.userId;

  if (!searchHistory.has(userId)) {
    searchHistory.set(userId, []);
  }

  const userSearches = searchHistory.get(userId);
  userSearches.push({
    query: query.trim(),
    timestamp: new Date(),
    resultCount,
  });

  // Keep only last 100 searches per user (optional optimization)
  if (userSearches.length > 100) {
    userSearches.shift();
  }

  return true; // Successfully tracked
};

export const revReviewDomainService = {
  /**
   * AUTHENTICATION METHODS
   */

  /**
   * Register a new user with Supabase
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{user, session, token}>}
   */
  async registerUser(email, password) {
    const client = getSupabaseClient();

    const { data, error } = await client.auth.signUpWithPassword({
      email,
      password,
    });

    if (error) {
      throw new HttpError(400, `Registration failed: ${error.message}`);
    }

    const sessionToken = createSessionToken(data.user.id);
    userSessions.set(sessionToken, {
      userId: data.user.id,
      email: data.user.email,
      createdAt: new Date(),
      accessToken: data.session?.access_token,
    });

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        createdAt: data.user.created_at,
      },
      session: data.session,
      sessionToken,
    };
  },

  /**
   * Login user with Supabase credentials
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{user, session, token}>}
   */
  async loginUser(email, password) {
    const client = getSupabaseClient();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new HttpError(401, `Login failed: ${error.message}`);
    }

    const sessionToken = createSessionToken(data.user.id);
    userSessions.set(sessionToken, {
      userId: data.user.id,
      email: data.user.email,
      createdAt: new Date(),
      accessToken: data.session?.access_token,
    });

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        lastSignInAt: data.user.last_sign_in_at,
      },
      session: data.session,
      sessionToken,
    };
  },

  /**
   * Verify session token validity
   * @param {string} sessionToken - The session token to verify
   * @returns {boolean} - True if valid, false otherwise
   */
  verifySessionToken(sessionToken) {
    if (!sessionToken || !userSessions.has(sessionToken)) {
      return false;
    }

    const session = userSessions.get(sessionToken);
    const sessionAge = Date.now() - session.createdAt.getTime();
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxSessionAge) {
      userSessions.delete(sessionToken);
      return false;
    }

    return true;
  },

  /**
   * Get current user from session token
   * @param {string} sessionToken - The session token
   * @returns {Object|null} - User object or null if invalid
   */
  getCurrentUser(sessionToken) {
    if (!this.verifySessionToken(sessionToken)) {
      return null;
    }

    return userSessions.get(sessionToken);
  },

  /**
   * Logout user and invalidate session
   * @param {string} sessionToken - The session token to invalidate
   */
  logoutUser(sessionToken) {
    if (userSessions.has(sessionToken)) {
      userSessions.delete(sessionToken);
    }
  },

  /**
   * VEHICLE DATA RETRIEVAL METHODS
   */

  /**
   * Get all brands with optional search
   * @param {string} query - Optional search query for brand filtering
   * @returns {Promise<Array>} - List of brands
   */
  async getBrands(query) {
    try {
      if (query && query.trim()) {
        return await vehicleRepository.searchBrands(query);
      }
      return await vehicleRepository.getAllBrands();
    } catch (error) {
      throw new HttpError(500, `Failed to retrieve brands: ${error.message}`);
    }
  },

  /**
   * Get brand by ID
   * @param {number} brandId - Brand ID
   * @returns {Promise<Object>} - Brand object
   */
  async getBrandById(brandId) {
    try {
      const brand = await vehicleRepository.getBrandById(brandId);
      if (!brand) {
        throw new HttpError(404, `Brand with ID ${brandId} not found`);
      }
      return brand;
    } catch (error) {
      throw new HttpError(500, `Failed to retrieve brand: ${error.message}`);
    }
  },

  /**
   * Get all models with optional search
   * @param {string} query - Optional search query for model filtering
   * @returns {Promise<Array>} - List of models with related data
   */
  async getModels(query) {
    try {
      if (query && query.trim()) {
        return await vehicleRepository.searchModels(query);
      }
      return await vehicleRepository.getAllModels();
    } catch (error) {
      throw new HttpError(500, `Failed to retrieve models: ${error.message}`);
    }
  },

  /**
   * Get model by ID with related data
   * @param {number} modelId - Model ID
   * @returns {Promise<Object>} - Model object with related data
   */
  async getModelById(modelId) {
    try {
      const model = await vehicleRepository.getModelById(modelId);
      if (!model) {
        throw new HttpError(404, `Model with ID ${modelId} not found`);
      }
      return model;
    } catch (error) {
      throw new HttpError(500, `Failed to retrieve model: ${error.message}`);
    }
  },

  /**
   * Search vehicles across all fields
   * @param {string} query - Search query (brand, model, engine, etc.)
   * @returns {Promise<{exact, autocorrect, suggestions}>} - Search results with auto-correct
   */
  async searchVehicles(query) {
    try {
      if (!query || query.trim().length < 2) {
        throw new HttpError(400, "Search query must be at least 2 characters");
      }

      // Search across brands and models
      const brands = await vehicleRepository.searchBrands(query);
      const models = await vehicleRepository.searchModels(query);
      const vehicles = await vehicleRepository.searchVehicles(query);

      // Build auto-correct result
      const autoCorrectResult = buildAutoCorrectResult(query);
      const rankedSuggestions = rankSuggestions(query, vehicles);

      return {
        query,
        exact: {
          brands,
          models,
          vehicles,
        },
        autocorrect: autoCorrectResult,
        suggestions: rankedSuggestions,
        totalResults: brands.length + models.length + vehicles.length,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(500, `Search failed: ${error.message}`);
    }
  },

  /**
   * Get vehicle by brand and model
   * @param {string} brand - Brand name
   * @param {string} model - Model name
   * @returns {Promise<Object>} - Complete vehicle data with specs
   */
  async getVehicleByBrandAndModel(brand, model) {
    try {
      const vehicle = await vehicleRepository.getVehicleByBrandAndModel(
        brand,
        model,
      );

      if (!vehicle) {
        throw new HttpError(
          404,
          `Vehicle not found for ${brand} ${model}`,
        );
      }

      return this._mapVehicle(vehicle);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(
        500,
        `Failed to retrieve vehicle: ${error.message}`,
      );
    }
  },

  /**
   * Get vehicles by brand
   * @param {number} brandId - Brand ID
   * @returns {Promise<Array>} - List of vehicles for the brand
   */
  async getVehiclesByBrand(brandId) {
    try {
      return await vehicleRepository.getVehiclesByBrand(brandId);
    } catch (error) {
      throw new HttpError(
        500,
        `Failed to retrieve vehicles for brand: ${error.message}`,
      );
    }
  },

  /**
   * Get all vehicle dimensions
   * @returns {Promise<Array>} - List of all vehicle dimensions
   */
  async getDimensions() {
    try {
      return await vehicleRepository.getAllDimensions();
    } catch (error) {
      throw new HttpError(
        500,
        `Failed to retrieve dimensions: ${error.message}`,
      );
    }
  },

  /**
   * Get dimensions by ID
   * @param {number} dimId - Dimension ID
   * @returns {Promise<Object>} - Dimension object
   */
  async getDimensionById(dimId) {
    try {
      const dimension = await vehicleRepository.getDimensionById(dimId);
      if (!dimension) {
        throw new HttpError(404, `Dimensions with ID ${dimId} not found`);
      }
      return dimension;
    } catch (error) {
      throw new HttpError(
        500,
        `Failed to retrieve dimension: ${error.message}`,
      );
    }
  },

  /**
   * Get all engine performance records
   * @returns {Promise<Array>} - List of all performance records
   */
  async getEnginePerformance() {
    try {
      return await vehicleRepository.getAllEnginePerformance();
    } catch (error) {
      throw new HttpError(
        500,
        `Failed to retrieve engine performance: ${error.message}`,
      );
    }
  },

  /**
   * Get engine performance by ID
   * @param {number} performanceId - Performance ID
   * @returns {Promise<Object>} - Performance object
   */
  async getEnginePerformanceById(performanceId) {
    try {
      const performance = await vehicleRepository.getEnginePerformanceById(
        performanceId,
      );
      if (!performance) {
        throw new HttpError(
          404,
          `Engine performance with ID ${performanceId} not found`,
        );
      }
      return performance;
    } catch (error) {
      throw new HttpError(
        500,
        `Failed to retrieve engine performance: ${error.message}`,
      );
    }
  },

  /**
   * Get all prices
   * @returns {Promise<Array>} - List of all prices
   */
  async getPrices() {
    try {
      return await vehicleRepository.getAllPrices();
    } catch (error) {
      throw new HttpError(500, `Failed to retrieve prices: ${error.message}`);
    }
  },

  /**
   * Get price by model ID
   * @param {number} modelId - Model ID
   * @returns {Promise<Object>} - Price object
   */
  async getPriceByModelId(modelId) {
    try {
      const price = await vehicleRepository.getPriceByModelId(modelId);
      if (!price) {
        throw new HttpError(404, `Price for model ${modelId} not found`);
      }
      return price;
    } catch (error) {
      throw new HttpError(
        500,
        `Failed to retrieve price: ${error.message}`,
      );
    }
  },

  /**
   * SUPABASE TABLE INTEGRATION
   */

  /**
   * Get data from any Supabase table with user context
   * @param {string} tableName - Supabase table name
   * @param {number} limit - Max rows to retrieve (default 100, max 500)
   * @returns {Promise<{table, count, rows}>} - Table data
   */
  async getSupabaseTableData(tableName, limit = 100) {
    try {
      return await supabaseRepository.readTableRows({
        tableName,
        limit,
      });
    } catch (error) {
      throw new HttpError(
        500,
        `Failed to retrieve Supabase table data: ${error.message}`,
      );
    }
  },

  /**
   * Get acquired vehicles data from Supabase
   * @param {number} limit - Max rows to retrieve
   * @returns {Promise<{table, count, rows}>} - Acquired data
   */
  async getAcquiredVehicles(limit = 100) {
    try {
      const rows = await supabaseRepository.readTableRows({
        tableName: env.supabaseAcquiredTable,
        limit,
      });

      return {
        table: env.supabaseAcquiredTable,
        count: rows.length,
        rows,
      };
    } catch (error) {
      throw new HttpError(
        500,
        `Failed to retrieve acquired vehicles: ${error.message}`,
      );
    }
  },

  /**
   * UTILITY METHODS
   */

  /**
   * Track search query for authenticated users only
   * @param {string} sessionToken - User session token
   * @param {string} query - Search query
   * @param {number} resultCount - Number of results found
   * @returns {boolean} - True if tracked, false if user not authenticated
   */
  trackUserSearch(sessionToken, query, resultCount = 0) {
    return trackSearch(sessionToken, query, resultCount);
  },

  /**
   * Get search history for authenticated user
   * @param {string} sessionToken - User session token
   * @returns {Array|null} - Array of searches or null if not authenticated
   */
  getUserSearchHistory(sessionToken) {
    if (!sessionToken || !userSessions.has(sessionToken)) {
      return null; // Not authenticated
    }

    const user = userSessions.get(sessionToken);
    return searchHistory.get(user.userId) || [];
  },

  /**
   * Get search history stats for authenticated user
   * @param {string} sessionToken - User session token
   * @returns {Object|null} - Search stats or null if not authenticated
   */
  getUserSearchStats(sessionToken) {
    if (!sessionToken || !userSessions.has(sessionToken)) {
      return null; // Not authenticated
    }

    const user = userSessions.get(sessionToken);
    const searches = searchHistory.get(user.userId) || [];

    const uniqueQueries = new Set(searches.map((s) => s.query.toLowerCase()));
    const totalResults = searches.reduce((sum, s) => sum + s.resultCount, 0);

    return {
      userId: user.userId,
      email: user.email,
      totalSearches: searches.length,
      uniqueSearches: uniqueQueries.size,
      totalResults,
      averageResults: searches.length > 0 ? Math.round(totalResults / searches.length) : 0,
      lastSearch: searches.length > 0 ? searches[searches.length - 1] : null,
    };
  },

  /**
   * Clear search history for authenticated user
   * @param {string} sessionToken - User session token
   * @returns {boolean} - True if cleared, false if not authenticated
   */
  clearUserSearchHistory(sessionToken) {
    if (!sessionToken || !userSessions.has(sessionToken)) {
      return false; // Not authenticated
    }

    const user = userSessions.get(sessionToken);
    searchHistory.delete(user.userId);
    return true;
  },

  /**
   * Get all search analytics (admin only)
   * @returns {Object} - Analytics data
   */
  getSearchAnalytics() {
    const stats = {
      totalUsers: userSessions.size,
      totalSearchRecords: 0,
      userStats: [],
    };

    searchHistory.forEach((searches, userId) => {
      const user = Array.from(userSessions.values()).find(
        (u) => u.userId === userId,
      );

      if (user && searches.length > 0) {
        stats.totalSearchRecords += searches.length;
        stats.userStats.push({
          userId,
          email: user.email,
          searchCount: searches.length,
          lastSearch: searches[searches.length - 1],
        });
      }
    });

    return stats;
  },

  /**
   * Map vehicle data to consistent format
   * @private
   * @param {Object} row - Raw vehicle data
   * @returns {Object} - Mapped vehicle object
   */
  _mapVehicle(row) {
    return {
      id: `${row.brandId}-${row.modelId}`,
      brand: row.brand,
      model: row.model,
      price: row.price,
      priceStatus: row.priceStatus,
      priceExclEmissionsTax: row.priceExclEmissionsTax,
      engine: row.engine,
      cylinders: row.cylinders,
      power: row.power,
      torque: row.torque,
      acceleration: row.acceleration,
      topSpeed: row.topSpeed,
      fuelConsumption: row.fuelConsumption,
      fuelRange: row.fuelRange,
      dimensions: {
        length: row.length,
        width: row.width,
        widthExclMirrorsInclMirrors: row.widthExclMirrorsInclMirrors || row.width,
        height: row.height,
        wheelbase: row.wheelbase,
        groundClearance: row.groundClearance,
      },
    };
  },

  /**
   * Get domain service health status
   * @returns {Promise<{healthy, supabase, database, sessions}>}
   */
  async getHealthStatus() {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from(env.supabaseAcquiredTable)
        .select("*", { count: "exact", head: true })
        .limit(1);

      return {
        healthy: !error,
        supabase: {
          connected: !error,
          error: error?.message || null,
        },
        database: {
          tables: [
            "BrandTable",
            "ModelTable",
            "PriceTable",
            "EnginePerformanceTable",
            "VehicleDimensionsTable",
          ],
        },
        sessions: {
          active: userSessions.size,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        supabase: {
          connected: false,
          error: error.message,
        },
        database: {
          tables: [],
        },
        sessions: {
          active: userSessions.size,
        },
      };
    }
  },
};

export default revReviewDomainService;
