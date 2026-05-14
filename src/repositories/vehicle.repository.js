import { getSupabase } from "../config/database.js";
import { HttpError } from "../utils/http-error.js";

// PostgREST embedded-join select for full vehicle data.
// Relies on FK relationships declared in the Supabase schema:
//   model_table.brand_id   → brand_table.brand_id   (!inner = INNER JOIN)
//   price_table.model_id   → model_table.model_id   (LEFT JOIN)
//   engine_performance_table.model_id → model_table.model_id (LEFT JOIN)
//   vehicle_dimensions_table.model_id → model_table.model_id (LEFT JOIN)
const VEHICLE_SELECT = [
  "model_id",
  "model_names",
  "brand_table!inner ( brand_id, brand_names )",
  "price_table ( price, price_excl_emissions_tax )",
  "engine_performance_table ( engine, cylinders, power, torque, acceleration, top_speed, fuel_consumption, fuel_range )",
  "vehicle_dimensions_table ( length, width_excl_mirrors_incl_mirrors, height, wheelbase, ground_clearance_minimum_maximum )",
].join(", ");

const mapRow = (row) => {
  const price = row.price_table?.[0] ?? {};
  const ep = row.engine_performance_table?.[0] ?? {};
  const dim = row.vehicle_dimensions_table?.[0] ?? {};
  const brand = row.brand_table ?? {};

  return {
    brandId: brand.brand_id ?? null,
    brand: brand.brand_names ?? null,
    modelId: row.model_id,
    model: row.model_names,
    price: price.price ?? null,
    priceExclEmissionsTax: price.price_excl_emissions_tax ?? null,
    priceStatus: null,
    engine: ep.engine ?? null,
    cylinders: ep.cylinders ?? null,
    power: ep.power ?? null,
    torque: ep.torque ?? null,
    acceleration: ep.acceleration ?? null,
    topSpeed: ep.top_speed ?? null,
    fuelConsumption: ep.fuel_consumption ?? null,
    fuelRange: ep.fuel_range ?? null,
    length: dim.length ?? null,
    width: dim.width_excl_mirrors_incl_mirrors ?? null,
    widthExclMirrorsInclMirrors: dim.width_excl_mirrors_incl_mirrors ?? null,
    height: dim.height ?? null,
    wheelbase: dim.wheelbase ?? null,
    groundClearance: dim.ground_clearance_minimum_maximum ?? null,
  };
};

const throwOnError = (error) => {
  if (error) throw new HttpError(503, error.message);
};

// Resolve brand name → brand_id. Returns null when the brand is not found.
const resolveBrandId = async (db, brand) => {
  const { data, error } = await db
    .from("brand_table")
    .select("brand_id")
    .ilike("brand_names", brand)
    .limit(1)
    .maybeSingle();

  if (error) throw new HttpError(503, error.message);
  return data?.brand_id ?? null;
};

export const vehicleRepository = {
  async getAllBrands() {
    const db = getSupabase();
    const { data, error } = await db
      .from("brand_table")
      .select("brand_names")
      .order("brand_names");

    throwOnError(error);
    return data.map((row) => row.brand_names);
  },

  async searchBrands(query) {
    const db = getSupabase();
    const { data, error } = await db
      .from("brand_table")
      .select("brand_names")
      .ilike("brand_names", `%${query}%`)
      .order("brand_names");

    throwOnError(error);
    return data.map((row) => row.brand_names);
  },

  async getBrandsWithCount() {
    const db = getSupabase();

    // Fetch brands and all model brand_ids in parallel, then merge in JS.
    const [{ data: brands, error: brandsError }, { data: models, error: modelsError }] =
      await Promise.all([
        db.from("brand_table").select("brand_id, brand_names").order("brand_names"),
        db.from("model_table").select("brand_id"),
      ]);

    throwOnError(brandsError);
    throwOnError(modelsError);

    const countByBrand = (models ?? []).reduce((acc, m) => {
      acc[m.brand_id] = (acc[m.brand_id] || 0) + 1;
      return acc;
    }, {});

    return brands.map((row) => ({
      name: row.brand_names,
      count: countByBrand[row.brand_id] || 0,
    }));
  },

  async getModelsByBrand(brand) {
    const db = getSupabase();
    const brandId = await resolveBrandId(db, brand);
    if (!brandId) return [];

    const { data, error } = await db
      .from("model_table")
      .select("model_names")
      .eq("brand_id", brandId)
      .order("model_names");

    throwOnError(error);
    return [...new Set(data.map((row) => row.model_names))];
  },

  async searchModelsByBrand(brand, query) {
    const db = getSupabase();
    const brandId = await resolveBrandId(db, brand);
    if (!brandId) return [];

    const { data, error } = await db
      .from("model_table")
      .select("model_names")
      .eq("brand_id", brandId)
      .ilike("model_names", `%${query}%`)
      .order("model_names");

    throwOnError(error);
    return [...new Set(data.map((row) => row.model_names))];
  },

  async getVehicleDetails(brand, model) {
    const db = getSupabase();
    const brandId = await resolveBrandId(db, brand);
    if (!brandId) return null;

    const { data, error } = await db
      .from("model_table")
      .select(VEHICLE_SELECT)
      .eq("brand_id", brandId)
      .ilike("model_names", model)
      .limit(1)
      .maybeSingle();

    throwOnError(error);
    return data ? mapRow(data) : null;
  },

  async getVehicleByModelId(modelId) {
    const db = getSupabase();
    const { data, error } = await db
      .from("model_table")
      .select(VEHICLE_SELECT)
      .eq("model_id", modelId)
      .maybeSingle();

    throwOnError(error);
    return data ? mapRow(data) : null;
  },

  async searchVehicles({ brand, model, limit = 25 }) {
    const db = getSupabase();

    let brandId = null;
    if (brand) {
      brandId = await resolveBrandId(db, brand);
      if (!brandId) return [];
    }

    let q = db.from("model_table").select(VEHICLE_SELECT);
    if (brandId) q = q.eq("brand_id", brandId);
    if (model) q = q.ilike("model_names", `%${model}%`);

    const { data, error } = await q.order("model_names").limit(limit);
    throwOnError(error);
    return data.map(mapRow);
  },
};
