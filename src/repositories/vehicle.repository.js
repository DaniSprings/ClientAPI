import { executeQuery } from "../config/database.js";

const vehicleSelect = `
SELECT
  b.Brand_ID AS brandId,
  b.BrandNames AS brand,
  m.MODEL_ID AS modelId,
  m.ModelNames AS model,
  p.Price AS price,
  p.price_excl_emissions_tax AS priceExclEmissionsTax,
  CAST(NULL AS NVARCHAR(20)) AS priceStatus,
  ep.ENGINE AS engine,
  ep.CYLINDERS AS cylinders,
  ep.POWER AS power,
  ep.TORQUE AS torque,
    ep.Acceleration AS acceleration,
    ep.TopSpeed AS topSpeed,
  ep.[Fuel Consumption] AS fuelConsumption,
  ep.[Fuel Range] AS fuelRange,
  vd.length AS length,
  vd.width_excl_mirrors_incl_mirrors AS width,
  vd.width_excl_mirrors_incl_mirrors AS widthExclMirrorsInclMirrors,
  vd.height AS height,
  vd.wheelbase AS wheelbase,
  vd.ground_clearance_minimum_maximum AS groundClearance
FROM BrandTable b
INNER JOIN ModelTable m ON m.Brand_ID = b.Brand_ID
LEFT JOIN PriceTable p ON p.MODEL_ID = m.MODEL_ID
LEFT JOIN EnginePerformanceTable ep ON ep.MODEL_ID = m.MODEL_ID
LEFT JOIN VehicleDimensionsTable vd ON vd.MODEL_ID = m.MODEL_ID
`;

export const vehicleRepository = {
  async getAllBrands() {
    const result = await executeQuery((request) =>
      request.query(`
        SELECT BrandNames
        FROM BrandTable
        ORDER BY BrandNames;
      `),
    );

    return result.recordset.map((row) => row.BrandNames);
  },

  async searchBrands(query) {
    const result = await executeQuery((request, sql) =>
      request.input("query", sql.NVarChar(100), `%${query}%`).query(`
          SELECT BrandNames
          FROM BrandTable
          WHERE BrandNames LIKE @query
          ORDER BY BrandNames;
        `),
    );

    return result.recordset.map((row) => row.BrandNames);
  },

  async getBrandsWithCount() {
    const result = await executeQuery((request) =>
      request.query(`
        SELECT
            b.BrandNames AS name,
            COUNT(DISTINCT m.MODEL_ID) AS count
        FROM BrandTable b
        LEFT JOIN ModelTable m ON m.Brand_ID = b.Brand_ID
        GROUP BY b.BrandNames
        ORDER BY b.BrandNames;
      `),
    );

    return result.recordset;
  },

  async getModelsByBrand(brand) {
    const result = await executeQuery((request, sql) =>
      request.input("brand", sql.NVarChar(100), brand).query(`
          SELECT DISTINCT m.ModelNames
          FROM ModelTable m
          INNER JOIN BrandTable b ON b.Brand_ID = m.Brand_ID
          WHERE b.BrandNames = @brand
          ORDER BY m.ModelNames;
        `),
    );

    return result.recordset.map((row) => row.ModelNames);
  },

  async searchModelsByBrand(brand, query) {
    const result = await executeQuery((request, sql) =>
      request
        .input("brand", sql.NVarChar(100), brand)
        .input("query", sql.NVarChar(100), `%${query}%`).query(`
          SELECT DISTINCT m.ModelNames
          FROM ModelTable m
          INNER JOIN BrandTable b ON b.Brand_ID = m.Brand_ID
          WHERE b.BrandNames = @brand
            AND m.ModelNames LIKE @query
          ORDER BY m.ModelNames;
        `),
    );

    return result.recordset.map((row) => row.ModelNames);
  },

  async getVehicleDetails(brand, model) {
    const result = await executeQuery((request, sql) =>
      request
        .input("brand", sql.NVarChar(100), brand)
        .input("model", sql.NVarChar(100), model).query(`
          SELECT TOP (1) *
          FROM (
            ${vehicleSelect}
          ) vehicle
          WHERE vehicle.brand = @brand
            AND vehicle.model = @model;
        `),
    );

    return result.recordset[0] || null;
  },

  async getVehicleByModelId(modelId) {
    const result = await executeQuery((request, sql) =>
      request.input("modelId", sql.Int, modelId).query(`
          SELECT TOP (1) *
          FROM (
            ${vehicleSelect}
          ) vehicle
          WHERE vehicle.modelId = @modelId;
        `),
    );

    return result.recordset[0] || null;
  },

  async searchVehicles({ brand, model, limit = 25 }) {
    const clauses = [];

    const result = await executeQuery((request, sql) => {
      request.input("limit", sql.Int, limit);

      if (brand) {
        request.input("brand", sql.NVarChar(100), brand);
        clauses.push("vehicle.brand = @brand");
      }

      if (model) {
        request.input("model", sql.NVarChar(100), model);
        clauses.push("vehicle.model = @model");
      }

      const whereClause =
        clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

      return request.query(`
        SELECT TOP (@limit) *
        FROM (
          ${vehicleSelect}
        ) vehicle
        ${whereClause}
        ORDER BY vehicle.brand, vehicle.model;
      `);
    });

    return result.recordset;
  },
};
