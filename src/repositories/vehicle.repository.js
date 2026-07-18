import { getReadSupabase } from "../config/database.js";
import { HttpError } from "../utils/http-error.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isMissingRelation = (error) =>
  Boolean(
    error?.message?.includes("schema cache") ||
      error?.message?.includes("Could not find the table") ||
      error?.message?.includes("Could not find a relationship"),
  );

const withLegacyFallback = async (primaryQuery, fallbackQuery) => {
  const primaryResult = await primaryQuery();
  if (!primaryResult.error || !isMissingRelation(primaryResult.error)) {
    return primaryResult;
  }
  return fallbackQuery();
};

const throwOnError = (error) => {
  if (error) throw new HttpError(503, error.message);
};

// ─── PostgREST embedded-join select ──────────────────────────────────────────
// NOTE: "Engine" here must match the actual column name in performancetable.
// The Supabase schema uses "EngineType" — we alias it via mapRow below.
// If your performancetable column is literally "EngineType", change "Engine"
// to "EngineType" in this string and update mapRow accordingly.
const VEHICLE_SELECT = [
  "MODEL_ID",
  "ModelNames",
  "BodyShape",
  "brandtable!inner ( Brand_ID, BrandNames )",
  "pricetable ( Price, price_excl_emissions_tax )",
  "performancetable ( EngineType, Cylinders, Fuel, Power, Torque, Acceleration, TopSpeed, AverageConsumption, Range )",
  "dimensiontable ( Length, width_excl_mirrors, width_incl_mirrors, height, wheelbase, ground_clearance )",
].join(", ");

// ─── Row mappers ─────────────────────────────────────────────────────────────

/** Maps a row returned by vehicle_view (flat columns, camelCase). */
const mapVehicleViewRow = (row) => ({
  brandId:                    row.brandId                    ?? row.brand_id    ?? null,
  brand:                      row.brand                                         ?? null,
  modelId:                    row.modelId                    ?? row.model_id,
  model:                      row.model,
  bodyShape:                  row.bodyShape                  ?? row.body_shape  ?? null,
  price:                      row.price                                         ?? null,
  priceExclEmissionsTax:      row.priceExclEmissionsTax      ?? row.price_excl_emissions_tax ?? null,
  priceStatus:                row.priceStatus                ?? row.price_status ?? null,
  engine:                     row.engine                     ?? row.engineType  ?? null,
  cylinders:                  row.cylinders                                     ?? null,
  fuel:                       row.fuel                                          ?? null,
  power:                      row.power                                         ?? null,
  torque:                     row.torque                                        ?? null,
  acceleration:               row.acceleration                                  ?? null,
  topSpeed:                   row.topSpeed                   ?? row.top_speed   ?? null,
  fuelConsumption:            row.fuelConsumption            ?? row.avg_consumption ?? null,
  fuelRange:                  row.fuelRange                  ?? row.range       ?? null,
  length:                     row.length                                        ?? null,
  width:                      row.width                      ?? row.width_excl_mirrors ?? null,
  widthExclMirrorsInclMirrors: row.widthExclMirrorsInclMirrors
                               ?? formatRange(row.width_excl_mirrors, row.width_incl_mirrors)
                               ?? null,
  height:                     row.height                                        ?? null,
  wheelbase:                  row.wheelbase                                     ?? null,
  groundClearance:            row.groundClearance            ?? row.ground_clearance ?? null,
});

/** Maps a raw modeltable row returned by the embedded-join fallback. */
const mapRow = (row) => {
  const price = row.pricetable?.[0]       ?? {};
  const ep    = row.performancetable?.[0] ?? {};
  const dim   = row.dimensiontable?.[0]   ?? {};
  const brand = row.brandtable            ?? {};

  return {
    brandId:                    brand.Brand_ID                                ?? null,
    brand:                      brand.BrandNames                              ?? null,
    modelId:                    row.MODEL_ID,
    model:                      row.ModelNames,
    bodyShape:                  row.BodyShape                                 ?? null,
    price:                      price.Price                                   ?? null,
    priceExclEmissionsTax:      price.price_excl_emissions_tax                ?? null,
    priceStatus:                null,
    // performancetable uses "EngineType" per the Supabase schema
    engine:                     ep.EngineType                                 ?? null,
    cylinders:                  ep.Cylinders                                  ?? null,
    fuel:                       ep.Fuel                                       ?? null,
    power:                      ep.Power                                      ?? null,
    torque:                     ep.Torque                                     ?? null,
    acceleration:               ep.Acceleration                               ?? null,
    topSpeed:                   ep.TopSpeed                                   ?? null,
    fuelConsumption:            ep.AverageConsumption                         ?? null,
    fuelRange:                  ep.Range                                      ?? null,
    length:                     dim.Length                                    ?? null,
    width:                      dim.width_excl_mirrors != null
                                  ? String(dim.width_excl_mirrors)            : null,
    widthExclMirrorsInclMirrors: formatRange(dim.width_excl_mirrors, dim.width_incl_mirrors),
    height:                     dim.height                                    ?? null,
    wheelbase:                  dim.wheelbase != null
                                  ? String(dim.wheelbase)                     : null,
    groundClearance:            dim.ground_clearance                          ?? null,
  };
};

const formatRange = (min, max) => {
  if (min == null && max == null) return null;
  if (min == null) return String(max);
  if (max == null) return String(min);
  return min === max ? String(min) : `${min} - ${max}`;
};

// ─── Brand helpers ────────────────────────────────────────────────────────────

/** Resolves a brand name string → numeric Brand_ID. Returns null if not found. */
const resolveBrandId = async (db, brand) => {
  const { data, error } = await withLegacyFallback(
    () =>
      db
        .from("brand_table")
        .select("brand_id")
        .ilike("brand_names", brand)
        .limit(1)
        .maybeSingle(),
    () =>
      db
        .from("brandtable")
        .select("Brand_ID")
        .ilike("BrandNames", brand)
        .limit(1)
        .maybeSingle(),
  );

  if (error) throw new HttpError(503, error.message);
  return data?.brand_id ?? data?.Brand_ID ?? null;
};

// ─── Repository ───────────────────────────────────────────────────────────────

export const vehicleRepository = {
  async getAllBrands() {
    const db = getReadSupabase();
    const { data, error } = await withLegacyFallback(
      () => db.from("brand_table").select("brand_names").order("brand_names"),
      () => db.from("brandtable").select("BrandNames").order("BrandNames"),
    );

    throwOnError(error);
    return data.map((row) => row.brand_names ?? row.BrandNames);
  },

  async searchBrands(query) {
    const db = getReadSupabase();
    const { data, error } = await withLegacyFallback(
      () =>
        db
          .from("brand_table")
          .select("brand_names")
          .ilike("brand_names", `%${query}%`)
          .order("brand_names"),
      () =>
        db
          .from("brandtable")
          .select("BrandNames")
          .ilike("BrandNames", `%${query}%`)
          .order("BrandNames"),
    );

    throwOnError(error);
    return data.map((row) => row.brand_names ?? row.BrandNames);
  },

  async getBrandsWithCount() {
    const db = getReadSupabase();

    const [
      { data: brands, error: brandsError },
      { data: modelRows, error: modelsError },
    ] = await Promise.all([
      withLegacyFallback(
        () =>
          db
            .from("brand_table")
            .select("brand_id, brand_names")
            .order("brand_names"),
        () =>
          db
            .from("brandtable")
            .select("Brand_ID, BrandNames")
            .order("BrandNames"),
      ),
      withLegacyFallback(
        () => db.from("model_table").select("brand_id"),
        () => db.from("modeltable").select("Brand_ID"),
      ),
    ]);

    throwOnError(brandsError);
    throwOnError(modelsError);

    const countByBrand = (modelRows ?? []).reduce((acc, m) => {
      const id = m.brand_id ?? m.Brand_ID;
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

    return brands.map((row) => ({
      name:  row.brand_names ?? row.BrandNames,
      count: countByBrand[row.brand_id ?? row.Brand_ID] || 0,
    }));
  },

  async getModelsByBrand(brand) {
    const db = getReadSupabase();
    const brandId = await resolveBrandId(db, brand);
    if (!brandId) return [];

    const { data, error } = await withLegacyFallback(
      () =>
        db
          .from("model_table")
          .select("model_names")
          .eq("brand_id", brandId)
          .order("model_names"),
      () =>
        db
          .from("modeltable")
          .select("ModelNames")
          .eq("Brand_ID", brandId)
          .order("ModelNames"),
    );

    throwOnError(error);
    return [...new Set(data.map((row) => row.model_names ?? row.ModelNames))];
  },

  async searchModelsByBrand(brand, query) {
    const db = getReadSupabase();
    const brandId = await resolveBrandId(db, brand);
    if (!brandId) return [];

    const { data, error } = await withLegacyFallback(
      () =>
        db
          .from("model_table")
          .select("model_names")
          .eq("brand_id", brandId)
          .ilike("model_names", `%${query}%`)
          .order("model_names"),
      () =>
        db
          .from("modeltable")
          .select("ModelNames")
          .eq("Brand_ID", brandId)
          .ilike("ModelNames", `%${query}%`)
          .order("ModelNames"),
    );

    throwOnError(error);
    return [...new Set(data.map((row) => row.model_names ?? row.ModelNames))];
  },

  async getVehicleDetails(brand, model) {
    const db = getReadSupabase();

    const { data, error } = await withLegacyFallback(
      // Primary: vehicle_view (flat, fast)
      () =>
        db
          .from("vehicle_view")
          .select("*")
          .ilike("brand", brand)
          .ilike("model", model)
          .limit(1)
          .maybeSingle(),
      // Fallback: raw embedded join across legacy tables
      async () => {
        const brandId = await resolveBrandId(db, brand);
        if (!brandId) return { data: null, error: null };

        return db
          .from("modeltable")
          .select(VEHICLE_SELECT)
          .eq("Brand_ID", brandId)
          .ilike("ModelNames", model)
          .limit(1)
          .maybeSingle();
      },
    );

    throwOnError(error);
    if (!data) return null;

    // Distinguish flat view row (has "brand" key) from embedded join row
    return "brand" in data ? mapVehicleViewRow(data) : mapRow(data);
  },

  async getVehicleByModelId(modelId) {
    const db = getReadSupabase();

    const { data, error } = await withLegacyFallback(
      () =>
        db
          .from("vehicle_view")
          .select("*")
          .eq("modelId", modelId)
          .maybeSingle(),
      () =>
        db
          .from("modeltable")
          .select(VEHICLE_SELECT)
          .eq("MODEL_ID", modelId)
          .maybeSingle(),
    );

    throwOnError(error);
    if (!data) return null;
    return "brand" in data ? mapVehicleViewRow(data) : mapRow(data);
  },

  async searchVehicles({ brand, model, limit = 25 }) {
    const db = getReadSupabase();

    const { data, error } = await withLegacyFallback(
      () => {
        let q = db.from("vehicle_view").select("*");
        if (brand) q = q.ilike("brand", brand);
        if (model) q = q.ilike("model", `%${model}%`);
        return q.order("brand").order("model").limit(limit);
      },
      async () => {
        let brandId = null;
        if (brand) {
          brandId = await resolveBrandId(db, brand);
          if (!brandId) return { data: [], error: null };
        }

        let q = db.from("modeltable").select(VEHICLE_SELECT);
        if (brandId) q = q.eq("Brand_ID", brandId);
        if (model)   q = q.ilike("ModelNames", `%${model}%`);
        return q.order("ModelNames").limit(limit);
      },
    );

    throwOnError(error);
    return data.map((row) =>
      "brand" in row ? mapVehicleViewRow(row) : mapRow(row),
    );
  },
};
