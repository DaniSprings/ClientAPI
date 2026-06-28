import { getReadSupabase } from "../config/database.js";
import { HttpError } from "../utils/http-error.js";

const isMissingRelation = (error) =>
  Boolean(error?.message?.includes("schema cache") || error?.message?.includes("Could not find the table"));

const withLegacyFallback = async (primaryQuery, fallbackQuery) => {
  const primaryResult = await primaryQuery();
  if (!primaryResult.error || !isMissingRelation(primaryResult.error)) {
    return primaryResult;
  }

  return fallbackQuery();
};

// PostgREST embedded-join select for full vehicle data.
// Relies on FK relationships declared in the Supabase schema:
// modeltable.Brand_ID    → brandtable.Brand_ID     (!inner = INNER JOIN)
// pricetable.MODEL_ID    → modeltable.MODEL_ID     (LEFT JOIN)
// performancetable.MODEL_ID → modeltable.MODEL_ID  (LEFT JOIN)
// dimensiontable2.MODEL_ID  → modeltable.MODEL_ID  (LEFT JOIN)
// NOTE: embedding only works if these FKs are actually declared as foreign
// keys in Postgres (not just same-named columns). If PostgREST can't find a
// relationship, this query will fail with "Could not find a relationship..."
// and this fallback path won't actually save you — see note below.

const VEHICLE_SELECT = [
  "MODEL_ID",
  "ModelNames",
  "brandtable!inner ( Brand_ID, BrandNames )",
  "pricetable ( Price, price_excl_emissions_tax )",
  "performancetable ( Engine, Cylinders, Power, Torque, Acceleration, TopSpeed, FuelConsumption, FuelRange )",
  "dimensiontable2 ( length, width, width_incl_mirrors, heightmin, heightmax, wheelbase, ground_min, ground_max )",
].join(", ");

const mapVehicleViewRow = (row) => ({
  brandId: row.brandId ?? null,
  brand: row.brand ?? null,
  modelId: row.modelId,
  model: row.model,
  price: row.price ?? null,
  priceExclEmissionsTax: row.priceExclEmissionsTax ?? null,
  priceStatus: row.priceStatus ?? null,
  engine: row.engine ?? null,
  cylinders: row.cylinders ?? null,
  power: row.power ?? null,
  torque: row.torque ?? null,
  acceleration: row.acceleration ?? null,
  topSpeed: row.topSpeed ?? null,
  fuelConsumption: row.fuelConsumption ?? null,
  fuelRange: row.fuelRange ?? null,
  length: row.length ?? null,
  width: row.width ?? null,
  widthExclMirrorsInclMirrors: row.widthInclMirrors ?? row.width ?? null,
  height: row.height ?? null,
  wheelbase: row.wheelbase ?? null,
  groundClearance: row.groundClearance ?? null,
});

const formatRange = (min, max) => {
  if (min == null && max == null) return null;
  if (min == null) return `${max}`;
  if (max == null) return `${min}`;
  return min === max ? `${min}` : `${min} - ${max}`;
};

const mapRow = (row) => {
  const price = row.pricetable?.[0] ?? {};
  const ep = row.performancetable?.[0] ?? {};
  const dim = row.dimensiontable2?.[0] ?? {};
  const brand = row.brandtable ?? {};

  return {
    brandId: brand.Brand_ID ?? null,
    brand: brand.BrandNames ?? null,
    modelId: row.MODEL_ID,
    model: row.ModelNames,
    price: price.Price ?? null,
    priceExclEmissionsTax: price.price_excl_emissions_tax ?? null,
    priceStatus: null,
    engine: ep.Engine ?? null,
    cylinders: ep.Cylinders ?? null,
    power: ep.Power ?? null,
    torque: ep.Torque ?? null,
    acceleration: ep.Acceleration ?? null,
    topSpeed: ep.TopSpeed ?? null,
    fuelConsumption: ep.FuelConsumption ?? null,
    fuelRange: ep.FuelRange ?? null,
    length: dim.length ?? null,
    width: dim.width ?? null,
    widthExclMirrorsInclMirrors: formatRange(dim.width, dim.width_incl_mirrors),
    height: formatRange(dim.heightmin, dim.heightmax),
    wheelbase: dim.wheelbase ?? null,
    groundClearance: formatRange(dim.ground_min, dim.ground_max),
  };
};

const throwOnError = (error) => {
  if (error) throw new HttpError(503, error.message);
};

// Resolve brand name → brand_id. Returns null when the brand is not found.
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

    const [{ data: brands, error: brandsError }, { data: models, error: modelsError }] =
      await Promise.all([
        withLegacyFallback(
          () => db.from("brand_table").select("brand_id, brand_names").order("brand_names"),
          () => db.from("brandtable").select("Brand_ID, BrandNames").order("BrandNames"),
        ),
        withLegacyFallback(
          () => db.from("model_table").select("brand_id"),
          () => db.from("modeltable").select("Brand_ID"),
        ),
      ]);

    throwOnError(brandsError);
    throwOnError(modelsError);

    const countByBrand = (models ?? []).reduce((acc, m) => {
      const brandId = m.brand_id ?? m.Brand_ID;
      acc[brandId] = (acc[brandId] || 0) + 1;
      return acc;
    }, {});

    return brands.map((row) => ({
      name: row.brand_names ?? row.BrandNames,
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
      () =>
        db
          .from("vehicle_view")
          .select("*")
          .ilike("brand", brand)
          .ilike("model", model)
          .limit(1)
          .maybeSingle(),
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
    return data.brand ? mapVehicleViewRow(data) : mapRow(data);
  },

  async getVehicleByModelId(modelId) {
    const db = getReadSupabase();
    const { data, error } = await withLegacyFallback(
      () => db.from("vehicle_view").select("*").eq("modelId", modelId).maybeSingle(),
      () =>
        db
          .from("modeltable")
          .select(VEHICLE_SELECT)
          .eq("MODEL_ID", modelId)
          .maybeSingle(),
    );

    throwOnError(error);
    if (!data) return null;
    return data.brand ? mapVehicleViewRow(data) : mapRow(data);
  },

  async searchVehicles({ brand, model, limit = 25 }) {
    const db = getReadSupabase();
    const { data, error } = await withLegacyFallback(
      () => {
        let q = db.from("vehicle_view").select("*");
        if (brand) q = q.ilike("brand", brand);
        if (model) q = q.ilike("model", `%${model}%`);
        return q.order("model").limit(limit);
      },
      async () => {
        let brandId = null;
        if (brand) {
          brandId = await resolveBrandId(db, brand);
          if (!brandId) return { data: [], error: null };
        }

        let q = db.from("modeltable").select(VEHICLE_SELECT);
        if (brandId) q = q.eq("Brand_ID", brandId);
        if (model) q = q.ilike("ModelNames", `%${model}%`);

        return q.order("ModelNames").limit(limit);
      },
    );

    throwOnError(error);
    return data.map((row) => (row.brand ? mapVehicleViewRow(row) : mapRow(row)));
  },
};