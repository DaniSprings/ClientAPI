import { getReadSupabase } from "../config/database.js";
import { HttpError } from "../utils/http-error.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const throwOnError = (error) => {
  if (error) throw new HttpError(503, error.message);
};

const formatRange = (min, max) => {
  if (min == null && max == null) return null;
  if (min == null) return String(max);
  if (max == null) return String(min);
  return min === max ? String(min) : `${min} - ${max}`;
};

// ─── Row mapper ──────────────────────────────────────────────────────────────
//
// IMPORTANT: Every key read here (row.X) MUST be one of vehicle_view's actual
// output column names — see Vehicle_view_column_names.txt. Do NOT reference
// raw table column names (e.g. bluetooth_connectivity, weight_din) here; the
// view already renames those. If you add a field to vehicle_view, add it here
// too, then run checkVehicleViewSchema() (bottom of file) to confirm it's wired
// up correctly before deploying.
//
// priceStatus / priceExclEmissionsTax are intentionally NOT mapped:
// pricetable only exposes ID, MODEL_ID, and Price in the normalized schema.
const mapVehicleViewRow = (row) => ({
  brandId:                    row.brandId                     ?? null,
  brand:                      row.brand                       ?? null,
  modelId:                    row.modelId,
  model:                      row.model,
  bodyShape:                  row.bodyShape                   ?? null,
  price:                      row.price                        ?? null,
  engine:                     row.engine                       ?? null,
  cylinders:                  row.cylinders                    ?? null,
  fuel:                       row.fuel                         ?? null,
  power:                      row.power                        ?? null,
  torque:                     row.torque                       ?? null,
  acceleration:               row.acceleration                 ?? null,
  topSpeed:                   row.topSpeed                     ?? null,
  fuelConsumption:            row.fuelConsumption              ?? null,
  fuelRange:                  row.fuelRange                    ?? null,
  tankSize:                   row.tankSize                     ?? null,
  steering:                   row.steering                     ?? null,
  drivenWheels:               row.drivenWheels                 ?? null,
  gearRatios:                 row.gearRatios                   ?? null,
  length:                     row.length                       ?? null,
  // vehicle_view has no combined "width" column — derive it here so the
  // existing API contract (a single `width` field) keeps working.
  width:                      formatRange(row.widthExclMirrors, row.widthInclMirrors),
  widthExclMirrors:           row.widthExclMirrors             ?? null,
  widthInclMirrors:           row.widthInclMirrors             ?? null,
  widthExclMirrorsInclMirrors: formatRange(row.widthExclMirrors, row.widthInclMirrors),
  height:                     row.height                       ?? null,
  wheelbase:                  row.wheelbase                    ?? null,
  groundClearance:            row.groundClearance              ?? null,

  // Towing & Mass
  towingBraked:               row.towingBraked                ?? null,
  towingUnbraked:             row.towingUnbraked               ?? null,
  kerbWeight:                 row.kerbWeight                   ?? null,
  gvm:                        row.gvm                          ?? null,
  loadVolume:                 row.loadVolume                   ?? null,
  dryWeight:                  row.dryWeight                    ?? null,
  payloadCapacity:            row.payloadCapacity              ?? null,
  // NOTE: view column is "towbarFitted", not "towbar" — fixed below.
  towbar:                     row.towbarFitted                 ?? null,
  wadingDepth:                row.wadingDepth                  ?? null,

  // Safety
  airbagQuantity:             row.airbagQuantity                ?? null,
  driverAirbag:               row.driverAirbag                  ?? null,
  frontPassengerAirbag:       row.frontPassengerAirbag          ?? null,
  driverKneeAirbag:           row.driverKneeAirbag              ?? null,
  passengerKneeAirbag:        row.passengerKneeAirbag           ?? null,
  frontSideAirbags:           row.frontSideAirbags              ?? null,
  rearSideAirbags:            row.rearSideAirbags               ?? null,
  curtainAirbags:             row.curtainAirbags                ?? null,
  childProofSafetyLock:       row.childProofSafetyLock          ?? null,
  isofixMountings:            row.isofixMountings                ?? null,
  collisionWarning:           row.collisionWarning              ?? null,

  // Extras
  airConditioning:            row.airConditioning               ?? null,
  rearAirConditioningControls: row.rearAirConditioningControls  ?? null,
  powerSteering:              row.powerSteering                 ?? null,
  electricPowerSteering:      row.electricPowerSteering         ?? null,
  leatherSteeringWheelRim:    row.leatherSteeringWheelRim       ?? null,
  multiFunctionSteeringWheelControls: row.multiFunctionSteeringWheelControls ?? null,
  navigation:                 row.navigation                    ?? null,
  cruiseControl:              row.cruiseControl                 ?? null,
  adaptiveCruiseControl:      row.adaptiveCruiseControl         ?? null,
  bluetooth:                  row.bluetooth                     ?? null,
  usbPort:                    row.usbPort                       ?? null,
  electricWindows:            row.electricWindows               ?? null,
  leatherUpholstery:          row.leatherUpholstery             ?? null,
  suedeClothUpholstery:       row.suedeClothUpholstery          ?? null,
  lumbarSupportAdjustment:    row.lumbarSupportAdjustment       ?? null,
  electricDriverSeat:         row.electricDriverSeat            ?? null,
  electricSeatMemory:         row.electricSeatMemory            ?? null,
  frontVentilatedSeats:       row.frontVentilatedSeats          ?? null,
  headUpDisplay:              row.headUpDisplay                 ?? null,
  controlsScreenInputMethod:  row.controlsScreenInputMethod     ?? null,
  attentionAssist:            row.attentionAssist                ?? null,
  laneDepartureWarning:       row.laneDepartureWarning          ?? null,
  heatedRearScreen:           row.heatedRearScreen              ?? null,
  autoDimExteriorMirrors:     row.autoDimExteriorMirrors        ?? null,

  // Service & Warranty
  warrantyYears:              row.warrantyYears                ?? null,
  warrantyDistance:           row.warrantyDistance              ?? null,
  serviceMaintenancePlan:     row.serviceMaintenancePlan        ?? null,
  servicePlanDistance:        row.servicePlanDistance           ?? null,
  servicePlanYears:           row.servicePlanYears              ?? null,
  maintenancePlan:            row.maintenancePlan                ?? null,
  maintenancePlanDistance:    row.maintenancePlanDistance       ?? null,
  maintenancePlanYears:       row.maintenancePlanYears          ?? null,
  serviceIntervalDistance:    row.serviceIntervalDistance       ?? null,
  serviceIntervalDistance1:   row.serviceIntervalDistance1      ?? null,
});

// ─── Brand helpers ────────────────────────────────────────────────────────────
// brandtable/modeltable are simple lookup tables that haven't been affected by
// the renaming issues (Brand_ID / BrandNames / ModelNames are unchanged), so
// these are left querying the raw tables directly. Everything that needs the
// full vehicle spec set goes through vehicle_view below.

const resolveBrandId = async (db, brand) => {
  const { data, error } = await db
    .from("brandtable")
    .select("Brand_ID")
    .ilike("BrandNames", brand)
    .limit(1)
    .maybeSingle();

  if (error) throw new HttpError(503, error.message);
  return data?.Brand_ID ?? null;
};

// ─── Repository ───────────────────────────────────────────────────────────────

export const vehicleRepository = {
  async getAllBrands() {
    const db = getReadSupabase();
    const { data, error } = await db
      .from("brandtable")
      .select("BrandNames")
      .order("BrandNames");

    throwOnError(error);
    return data.map((row) => row.BrandNames);
  },

  async searchBrands(query) {
    const db = getReadSupabase();
    const { data, error } = await db
      .from("brandtable")
      .select("BrandNames")
      .ilike("BrandNames", `%${query}%`)
      .order("BrandNames");

    throwOnError(error);
    return data.map((row) => row.BrandNames);
  },

  async getBrandsWithCount() {
    const db = getReadSupabase();

    const [
      { data: brands, error: brandsError },
      { data: modelRows, error: modelsError },
    ] = await Promise.all([
      db.from("brandtable").select("Brand_ID, BrandNames").order("BrandNames"),
      db.from("modeltable").select("Brand_ID"),
    ]);

    throwOnError(brandsError);
    throwOnError(modelsError);

    const countByBrand = (modelRows ?? []).reduce((acc, m) => {
      const id = m.Brand_ID;
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

    return brands.map((row) => ({
      name: row.BrandNames,
      count: countByBrand[row.Brand_ID] || 0,
    }));
  },

  async getModelsByBrand(brand) {
    const db = getReadSupabase();
    const brandId = await resolveBrandId(db, brand);
    if (!brandId) return [];

    const { data, error } = await db
      .from("modeltable")
      .select("ModelNames")
      .eq("Brand_ID", brandId)
      .order("ModelNames");

    throwOnError(error);
    return [...new Set(data.map((row) => row.ModelNames))];
  },

  async searchModelsByBrand(brand, query) {
    const db = getReadSupabase();
    const brandId = await resolveBrandId(db, brand);
    if (!brandId) return [];

    const { data, error } = await db
      .from("modeltable")
      .select("ModelNames")
      .eq("Brand_ID", brandId)
      .ilike("ModelNames", `%${query}%`)
      .order("ModelNames");

    throwOnError(error);
    return [...new Set(data.map((row) => row.ModelNames))];
  },

  // ── Full vehicle spec reads: ALWAYS through vehicle_view ──────────────────

  async getVehicleDetails(brand, model) {
    const db = getReadSupabase();

    const brandId = await resolveBrandId(db, brand);
    if (!brandId) return null;

    const { data, error } = await db
      .from("vehicle_view")
      .select("*")
      .eq("brandId", brandId)
      .ilike("model", model)
      .limit(1)
      .maybeSingle();

    throwOnError(error);
    if (!data) return null;
    return mapVehicleViewRow(data);
  },

  async getVehicleByModelId(modelId) {
    const db = getReadSupabase();

    const { data, error } = await db
      .from("vehicle_view")
      .select("*")
      .eq("modelId", modelId)
      .maybeSingle();

    throwOnError(error);
    if (!data) return null;
    return mapVehicleViewRow(data);
  },

  async searchVehicles({ brand, model, limit = 25 }) {
    const db = getReadSupabase();

    let brandId = null;
    if (brand) {
      brandId = await resolveBrandId(db, brand);
      if (!brandId) return [];
    }

    let q = db.from("vehicle_view").select("*");
    if (brandId) q = q.eq("brandId", brandId);
    if (model)   q = q.ilike("model", `%${model}%`);

    const { data, error } = await q.order("model").limit(limit);

    throwOnError(error);
    return data.map(mapVehicleViewRow);
  },
};

// ─── Schema safety net ────────────────────────────────────────────────────────
//
// This is the "step 3" safeguard: not a database command (Postgres has no way
// to auto-reroute a renamed column), but a runtime check you can call from a
// deploy/CI script. It fetches one real row from vehicle_view and confirms
// every field mapVehicleViewRow expects is actually present as a key on that
// row. If a future ALTER TABLE / view rebuild renames or drops a column this
// throws immediately, with the exact missing field names, instead of surfacing
// as a 503 in production.
//
// Suggested usage (e.g. in a predeploy npm script or CI step):
//   import { checkVehicleViewSchema } from "./vehicle_repository.js";
//   await checkVehicleViewSchema();
export const checkVehicleViewSchema = async () => {
  const db = getReadSupabase();
  const { data, error } = await db.from("vehicle_view").select("*").limit(1).maybeSingle();

  if (error) {
    throw new Error(`vehicle_view schema check failed to query the view: ${error.message}`);
  }
  if (!data) {
    throw new Error("vehicle_view schema check found no rows to validate against.");
  }

  // Fields mapVehicleViewRow actually reads off `row`. Kept in sync manually —
  // update this list whenever you add a new field to mapVehicleViewRow above.
  const expectedFields = [
    "brandId", "brand", "modelId", "model", "bodyShape", "price", "engine",
    "cylinders", "fuel", "power", "torque", "acceleration", "topSpeed",
    "fuelConsumption", "fuelRange", "tankSize", "steering", "drivenWheels",
    "gearRatios", "length", "widthExclMirrors", "widthInclMirrors", "height",
    "wheelbase", "groundClearance", "towingBraked", "towingUnbraked",
    "kerbWeight", "gvm", "loadVolume", "dryWeight", "payloadCapacity",
    "towbarFitted", "wadingDepth", "airbagQuantity", "driverAirbag",
    "frontPassengerAirbag", "driverKneeAirbag", "passengerKneeAirbag",
    "frontSideAirbags", "rearSideAirbags", "curtainAirbags",
    "childProofSafetyLock", "isofixMountings", "collisionWarning",
    "airConditioning", "rearAirConditioningControls", "powerSteering",
    "electricPowerSteering", "leatherSteeringWheelRim",
    "multiFunctionSteeringWheelControls", "navigation", "cruiseControl",
    "adaptiveCruiseControl", "bluetooth", "usbPort", "electricWindows",
    "leatherUpholstery", "suedeClothUpholstery", "lumbarSupportAdjustment",
    "electricDriverSeat", "electricSeatMemory", "frontVentilatedSeats",
    "headUpDisplay", "controlsScreenInputMethod", "attentionAssist",
    "laneDepartureWarning", "heatedRearScreen", "autoDimExteriorMirrors",
    "warrantyYears", "warrantyDistance", "serviceMaintenancePlan",
    "servicePlanDistance", "servicePlanYears", "maintenancePlan",
    "maintenancePlanDistance", "maintenancePlanYears",
    "serviceIntervalDistance", "serviceIntervalDistance1",
  ];

  const missing = expectedFields.filter((field) => !(field in data));
  if (missing.length > 0) {
    throw new Error(
      `vehicle_view is missing expected column(s): ${missing.join(", ")}. ` +
      `Update the view or mapVehicleViewRow to match.`,
    );
  }

  return true;
};
