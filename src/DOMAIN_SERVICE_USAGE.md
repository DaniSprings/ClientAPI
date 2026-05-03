/**
 * RevReview Domain Service - API Usage Guide
 *
 * This file demonstrates how to use the RevReview Domain Service API
 * endpoints for authentication, vehicle searches, and data retrieval.
 *
 * Base URL: http://localhost:4000/api/domain
 */

/**
 * ============================================================================
 * AUTHENTICATION ENDPOINTS
 * ============================================================================
 */

/**
 * 1. REGISTER NEW USER
 * POST /api/domain/auth/register
 * 
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePassword123!"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "User registered successfully",
 *   "data": {
 *     "user": {
 *       "id": "uuid",
 *       "email": "user@example.com",
 *       "createdAt": "2024-01-01T00:00:00Z"
 *     },
 *     "session": {...},
 *     "sessionToken": "session_uuid_timestamp_random"
 *   }
 * }
 * 
 * Usage:
 * const registerExample = async () => {
 *   const response = await fetch('http://localhost:4000/api/domain/auth/register', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       email: 'user@example.com',
 *       password: 'SecurePassword123!'
 *     })
 *   });
 *   const data = await response.json();
 *   console.log(data.data.sessionToken); // Save for authenticated requests
 * };
 */

/**
 * 2. LOGIN USER
 * POST /api/domain/auth/login
 * 
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePassword123!"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "data": {
 *     "user": {
 *       "id": "uuid",
 *       "email": "user@example.com",
 *       "lastSignInAt": "2024-01-01T00:00:00Z"
 *     },
 *     "session": {...},
 *     "sessionToken": "session_uuid_timestamp_random"
 *   }
 * }
 */

/**
 * 3. VERIFY SESSION
 * GET /api/domain/auth/verify?sessionToken=token
 * 
 * Response (valid):
 * {
 *   "success": true,
 *   "valid": true,
 *   "user": {
 *     "userId": "uuid",
 *     "email": "user@example.com",
 *     "createdAt": "2024-01-01T00:00:00Z"
 *   }
 * }
 * 
 * Response (invalid):
 * {
 *   "success": true,
 *   "valid": false,
 *   "user": null
 * }
 */

/**
 * 4. GET CURRENT USER
 * GET /api/domain/auth/user?sessionToken=token
 * 
 * Response:
 * {
 *   "success": true,
 *   "user": {
 *     "userId": "uuid",
 *     "email": "user@example.com",
 *     "createdAt": "2024-01-01T00:00:00Z",
 *     "accessToken": "supabase_jwt_token"
 *   }
 * }
 */

/**
 * 5. LOGOUT USER
 * POST /api/domain/auth/logout
 * 
 * Request Body:
 * { "sessionToken": "session_token" }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 */

/**
 * ============================================================================
 * VEHICLE SEARCH ENDPOINTS
 * ============================================================================
 */

/**
 * 6. SEARCH ALL VEHICLES
 * GET /api/domain/vehicles/search?q=BMW&limit=100
 * 
 * Advanced search across brands, models, and specs with auto-correct
 * 
 * Response:
 * {
 *   "success": true,
 *   "query": "BMW",
 *   "totalResults": 45,
 *   "data": {
 *     "query": "BMW",
 *     "exact": {
 *       "brands": [{...}],
 *       "models": [{...}],
 *       "vehicles": [{...}]
 *     },
 *     "autocorrect": {...},
 *     "suggestions": [{...}]
 *   }
 * }
 * 
 * Usage:
 * const searchVehicles = async (query) => {
 *   const response = await fetch(
 *     `http://localhost:4000/api/domain/vehicles/search?q=${encodeURIComponent(query)}`
 *   );
 *   return await response.json();
 * };
 */

/**
 * 7. GET BRANDS
 * GET /api/domain/vehicles/brands?q=search_term
 * 
 * Response:
 * {
 *   "success": true,
 *   "count": 50,
 *   "data": [
 *     {
 *       "brandId": 1,
 *       "brand": "BMW",
 *       "country": "Germany"
 *     },
 *     ...
 *   ]
 * }
 * 
 * Usage:
 * const getBrands = async () => {
 *   const response = await fetch('http://localhost:4000/api/domain/vehicles/brands');
 *   return await response.json();
 * };
 */

/**
 * 8. GET BRAND BY ID
 * GET /api/domain/vehicles/brands/:id
 * 
 * Example: GET /api/domain/vehicles/brands/1
 */

/**
 * 9. GET MODELS
 * GET /api/domain/vehicles/models?q=search_term
 * 
 * Response:
 * {
 *   "success": true,
 *   "count": 150,
 *   "data": [
 *     {
 *       "modelId": 1,
 *       "model": "3 Series",
 *       "brandId": 1,
 *       "brand": "BMW"
 *     },
 *     ...
 *   ]
 * }
 */

/**
 * 10. GET MODEL BY ID
 * GET /api/domain/vehicles/models/:id
 * 
 * Example: GET /api/domain/vehicles/models/1
 */

/**
 * 11. GET VEHICLE BY BRAND AND MODEL
 * GET /api/domain/vehicles/by-brand-model?brand=BMW&model=3%20Series
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "1-1",
 *     "brand": "BMW",
 *     "model": "3 Series",
 *     "price": 45000,
 *     "engine": "2.0L Turbo",
 *     "power": 330,
 *     "dimensions": {
 *       "length": 4.7,
 *       "width": 1.82,
 *       "height": 1.43,
 *       "wheelbase": 2.73
 *     }
 *   }
 * }
 */

/**
 * 12. GET VEHICLES BY BRAND
 * GET /api/domain/vehicles/brand/:brandId
 * 
 * Example: GET /api/domain/vehicles/brand/1
 */

/**
 * ============================================================================
 * VEHICLE SPECIFICATIONS ENDPOINTS
 * ============================================================================
 */

/**
 * 13. GET DIMENSIONS
 * GET /api/domain/specs/dimensions
 * 
 * Response:
 * {
 *   "success": true,
 *   "count": 1000,
 *   "data": [
 *     {
 *       "dimId": 1,
 *       "length": 4.7,
 *       "width": 1.82,
 *       "height": 1.43,
 *       ...
 *     },
 *     ...
 *   ]
 * }
 */

/**
 * 14. GET DIMENSIONS BY ID
 * GET /api/domain/specs/dimensions/:id
 * 
 * Example: GET /api/domain/specs/dimensions/1
 */

/**
 * 15. GET ENGINE PERFORMANCE
 * GET /api/domain/specs/performance
 * 
 * Response:
 * {
 *   "success": true,
 *   "count": 500,
 *   "data": [
 *     {
 *       "performanceId": 1,
 *       "engine": "2.0L Turbo",
 *       "cylinders": 4,
 *       "power": 330,
 *       "torque": 500,
 *       "acceleration": 5.1,
 *       "topSpeed": 250
 *     },
 *     ...
 *   ]
 * }
 */

/**
 * 16. GET ENGINE PERFORMANCE BY ID
 * GET /api/domain/specs/performance/:id
 * 
 * Example: GET /api/domain/specs/performance/1
 */

/**
 * 17. GET PRICES
 * GET /api/domain/specs/prices
 * 
 * Response:
 * {
 *   "success": true,
 *   "count": 300,
 *   "data": [
 *     {
 *       "modelId": 1,
 *       "price": 45000,
 *       "priceStatus": "current",
 *       "priceExclEmissionsTax": 44000
 *     },
 *     ...
 *   ]
 * }
 */

/**
 * 18. GET PRICE BY MODEL ID
 * GET /api/domain/specs/prices/:modelId
 * 
 * Example: GET /api/domain/specs/prices/1
 */

/**
 * ============================================================================
 * SUPABASE INTEGRATION ENDPOINTS
 * ============================================================================
 */

/**
 * 19. GET ACQUIRED VEHICLES
 * GET /api/domain/supabase/acquired?limit=100
 * 
 * Retrieve user-acquired vehicles from Supabase
 * 
 * Response:
 * {
 *   "success": true,
 *   "table": "acquired_table_name",
 *   "count": 25,
 *   "rows": [
 *     {
 *       "id": "uuid",
 *       "userId": "uuid",
 *       "vehicleId": "1-1",
 *       "acquiredAt": "2024-01-01T00:00:00Z"
 *     },
 *     ...
 *   ]
 * }
 */

/**
 * 20. GET ANY SUPABASE TABLE
 * GET /api/domain/supabase/table/:tableName?limit=100
 * 
 * Example: GET /api/domain/supabase/table/user_preferences?limit=50
 * 
 * Response:
 * {
 *   "success": true,
 *   "table": "user_preferences",
 *   "count": 50,
 *   "rows": [...]
 * }
 */

/**
 * ============================================================================
 * HEALTH & STATUS
 * ============================================================================
 */

/**
 * 21. GET DOMAIN SERVICE HEALTH
 * GET /api/domain/health
 * 
 * Response (healthy):
 * {
 *   "success": true,
 *   "healthy": true,
 *   "supabase": {
 *     "connected": true,
 *     "error": null
 *   },
 *   "database": {
 *     "tables": ["BrandTable", "ModelTable", "PriceTable", ...]
 *   },
 *   "sessions": {
 *     "active": 5
 *   }
 * }
 */

/**
 * ============================================================================
 * FRONTEND INTEGRATION EXAMPLES (React)
 * ============================================================================
 */

/**
 * Example: Authentication Service Hook
 */
const useRevReviewAuth = () => {
  const register = async (email, password) => {
    const response = await fetch('http://localhost:4000/api/domain/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.success) {
      localStorage.setItem('sessionToken', data.data.sessionToken);
    }
    return data;
  };

  const login = async (email, password) => {
    const response = await fetch('http://localhost:4000/api/domain/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.success) {
      localStorage.setItem('sessionToken', data.data.sessionToken);
    }
    return data;
  };

  const logout = async () => {
    const sessionToken = localStorage.getItem('sessionToken');
    await fetch('http://localhost:4000/api/domain/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken })
    });
    localStorage.removeItem('sessionToken');
  };

  const getCurrentUser = async () => {
    const sessionToken = localStorage.getItem('sessionToken');
    const response = await fetch(
      `http://localhost:4000/api/domain/auth/user?sessionToken=${sessionToken}`
    );
    return await response.json();
  };

  return { register, login, logout, getCurrentUser };
};

/**
 * Example: Search Service Hook
 */
const useRevReviewSearch = () => {
  const search = async (query) => {
    const response = await fetch(
      `http://localhost:4000/api/domain/vehicles/search?q=${encodeURIComponent(query)}`
    );
    return await response.json();
  };

  const getBrands = async (query) => {
    const url = query
      ? `http://localhost:4000/api/domain/vehicles/brands?q=${encodeURIComponent(query)}`
      : 'http://localhost:4000/api/domain/vehicles/brands';
    const response = await fetch(url);
    return await response.json();
  };

  const getModels = async (query) => {
    const url = query
      ? `http://localhost:4000/api/domain/vehicles/models?q=${encodeURIComponent(query)}`
      : 'http://localhost:4000/api/domain/vehicles/models';
    const response = await fetch(url);
    return await response.json();
  };

  return { search, getBrands, getModels };
};

/**
 * Example: Vehicle Details Service
 */
const useRevReviewVehicles = () => {
  const getVehicleDetails = async (brand, model) => {
    const response = await fetch(
      `http://localhost:4000/api/domain/vehicles/by-brand-model?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`
    );
    return await response.json();
  };

  const getVehiclesByBrand = async (brandId) => {
    const response = await fetch(
      `http://localhost:4000/api/domain/vehicles/brand/${brandId}`
    );
    return await response.json();
  };

  const getPrice = async (modelId) => {
    const response = await fetch(
      `http://localhost:4000/api/domain/specs/prices/${modelId}`
    );
    return await response.json();
  };

  const getPerformance = async (performanceId) => {
    const response = await fetch(
      `http://localhost:4000/api/domain/specs/performance/${performanceId}`
    );
    return await response.json();
  };

  return {
    getVehicleDetails,
    getVehiclesByBrand,
    getPrice,
    getPerformance
  };
};

export { useRevReviewAuth, useRevReviewSearch, useRevReviewVehicles };
