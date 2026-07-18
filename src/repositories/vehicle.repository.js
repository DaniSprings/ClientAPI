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
  "pricetable ( Price )",
  "performancetable ( EngineType, Cylinders, Fuel, Power, Torque, Acceleration, TopSpeed, AverageConsumption, Range, TankSize, Steering, DrivenWheels, GearRatios )",
  "dimensiontable ( Length, width_excl_mirrors, width_incl_mirrors, height, wheelbase, ground_clearance )",
  "towingtable ( towbarFitted:\"towbar / trailer hitch\", wadingDepth:\"wading depth\", loadVolume:\"load volume / capacity\", dryWeight:\"Dry weight (DIN)\", kerbWeight:\"Kerb weight (EU)\", payloadCapacity:\"load carrying capacity / payload\", gvm:\"gross weight (GVM)\", towingUnbraked:\"towing capacity - unbraked\", towingBraked:\"towing capacity - braked\" )",
  "safetytable ( driverAirbag:\"driver airbag\", frontPassengerAirbag:\"front passenger airbag\", driverKneeAirbag:\"driver knee airbag\", passengerKneeAirbag:\"passenger knee airbag\", frontSideAirbags:\"front side airbags\", rearSideAirbags:\"rear side airbags\", curtainAirbags:\"curtain airbags\", airbagQuantity:\"airbag quantity\", childProofSafetyLock:\"child-proof/safety lock\", isofixMountings:\"ISOFIX Seat Mountings\", collisionWarning:\"collision warning + auto brake\" )",
  "extrastable ( airConditioning:\"air conditioning\", rearAirConditioningControls:\"4-zone / rear air-conditioning controls\", powerSteering:\"power steering\", electricPowerSteering:\"electric power steering\", leatherSteeringWheelRim:\"leather steering wheel rim\", multiFunctionSteeringWheelControls:\"multi-function steering wheel controls\", laneDepartureWarning:\"lane departure warning\", attentionAssist:\"attention assist / rest assist / break alert / fatigue detectio\", headUpDisplay:\"head-up display\", controlsScreenInputMethod:\"controls screen input method\", navigation:\"navigation\", cruiseControl:\"cruise control\", adaptiveCruiseControl:\"active/adaptive cruise control\", bluetooth:\"Bluetooth connectivity\", usbPort:\"USB port\", electricWindows:\"electric windows\", heatedRearScreen:\"heated rear screen / rear demister\", autoDimExteriorMirrors:\"autodim exterior mirrors\", suedeClothUpholstery:\"suede-cloth upholstery\", leatherUpholstery:\"leather upholstery\", lumbarSupportAdjustment:\"lumbar support adjustment\", electricDriverSeat:\"electric seat adjustment - driver\", electricSeatMemory:\"memory for electric seat adjustment\", frontVentilatedSeats:\"ventilated seats - front\" )",
  "servicetable ( warrantyYears:\"warranty time (years)\", warrantyDistance:\"warranty distance\", serviceMaintenancePlan:\"service/maintenance plan\", servicePlanYears:\"service plan time (years)\", servicePlanDistance:\"service plan distance\", maintenancePlan:\"maintenance plan\", maintenancePlanYears:\"maintenance plan time (years)\", maintenancePlanDistance:\"maintenance plan distance\", serviceIntervalDistance:\"service interval distance\", serviceIntervalDistance1:\"service interval distance_1\" )",

].join(", ");

// ─── Row mappers ─────────────────────────────────────────────────────────────

/**
 * Maps a row returned by vehicle_view (flat columns, camelCase).
 * NOTE: this mirrors the current vehicle_view SQL definition exactly.
 * If you add/remove columns from the view, update this list to match —
 * do not silently allow it to drift, since there's no other guardrail
 * ensuring the two stay in sync.
 *
 * priceStatus / priceExclEmissionsTax are intentionally NOT mapped:
 * pricetable only ever had ID, MODEL_ID, Price — those two were always
 * placeholder nulls, never real columns.
 */
const mapVehicleViewRow = (row) => ({
  brandId:                    row.brandId                    ?? null,
  brand:                      row.brand                      ?? null,
  modelId:                    row.modelId,
  model:                      row.model,
  bodyShape:                  row.bodyShape                  ?? null,
  price:                      row.price                       ?? null,
  engine:                     row.engine                      ?? null,
  cylinders:                  row.cylinders                   ?? null,
  fuel:                       row.fuel                        ?? null,
  power:                      row.power                       ?? null,
  torque:                     row.torque                      ?? null,
  acceleration:               row.acceleration                ?? null,
  topSpeed:                   row.topSpeed                    ?? null,
  fuelConsumption:            row.fuelConsumption              ?? null,
  fuelRange:                  row.fuelRange                   ?? null,
  tankSize:                   row.tankSize                     ?? null,
  steering:                   row.steering                     ?? null,
  drivenWheels:               row.drivenWheels                ?? null,
  gearRatios:                 row.gearRatios                   ?? null,
  length:                     row.length                       ?? null,
  width:                      row.width                        ?? null,
  widthExclMirrorsInclMirrors: row.widthExclMirrorsInclMirrors ?? null,
  height:                     row.height                       ?? null,
  wheelbase:                  row.wheelbase                    ?? null,
  groundClearance:            row.groundClearance              ?? null,

  // Towing & Mass
  towingBraked:               row.towingBraked                ?? null,
  towingUnbraked:             row.towingUnbraked              ?? null,
  kerbWeight:                 row.kerbWeight                   ?? null,
  gvm:                        row.gvm                          ?? null,
  loadVolume:                 row.loadVolume                   ?? null,
  dryWeight:                  row.dryWeight                    ?? null,
  payloadCapacity:            row.payloadCapacity              ?? null,
  towbarFitted:               row.towbarFitted                 ?? null,
  wadingDepth:                row.wadingDepth                  ?? null,

  // Safety
  airbagQuantity:             row.airbagQuantity               ?? null,
  driverAirbag:               row.driverAirbag                 ?? null,
  frontPassengerAirbag:       row.frontPassengerAirbag         ?? null,
  driverKneeAirbag:           row.driverKneeAirbag             ?? null,
  passengerKneeAirbag:        row.passengerKneeAirbag          ?? null,
  frontSideAirbags:           row.frontSideAirbags             ?? null,
  rearSideAirbags:            row.rearSideAirbags              ?? null,
  curtainAirbags:             row.curtainAirbags               ?? null,
  childProofSafetyLock:       row.childProofSafetyLock         ?? null,
  isofixMountings:            row.isofixMountings               ?? null,
  collisionWarning:           row.collisionWarning             ?? null,

  // Extras
  airConditioning:            row.airConditioning              ?? null,
  rearAirConditioningControls: row.rearAirConditioningControls ?? null,
  powerSteering:              row.powerSteering                ?? null,
  electricPowerSteering:      row.electricPowerSteering        ?? null,
  leatherSteeringWheelRim:    row.leatherSteeringWheelRim      ?? null,
  multiFunctionSteeringWheelControls: row.multiFunctionSteeringWheelControls ?? null,
  navigation:                 row.navigation                    ?? null,
  cruiseControl:              row.cruiseControl                ?? null,
  adaptiveCruiseControl:      row.adaptiveCruiseControl        ?? null,
  bluetooth:                  row.bluetooth                     ?? null,
  usbPort:                    row.usbPort                       ?? null,
  electricWindows:            row.electricWindows               ?? null,
  leatherUpholstery:          row.leatherUpholstery            ?? null,
  suedeClothUpholstery:       row.suedeClothUpholstery          ?? null,
  lumbarSupportAdjustment:    row.lumbarSupportAdjustment       ?? null,
  electricDriverSeat:         row.electricDriverSeat           ?? null,
  electricSeatMemory:         row.electricSeatMemory            ?? null,
  frontVentilatedSeats:       row.frontVentilatedSeats          ?? null,
  headUpDisplay:              row.headUpDisplay                ?? null,
  controlsScreenInputMethod:  row.controlsScreenInputMethod     ?? null,
  attentionAssist:            row.attentionAssist               ?? null,
  laneDepartureWarning:       row.laneDepartureWarning         ?? null,
  heatedRearScreen:           row.heatedRearScreen             ?? null,
  autoDimExteriorMirrors:     row.autoDimExteriorMirrors        ?? null,

  // Service & Warranty
  warrantyYears:              row.warrantyYears                ?? null,
  warrantyDistance:           row.warrantyDistance             ?? null,
  serviceMaintenancePlan:     row.serviceMaintenancePlan        ?? null,
  servicePlanDistance:        row.servicePlanDistance          ?? null,
  servicePlanYears:           row.servicePlanYears             ?? null,
  maintenancePlan:            row.maintenancePlan               ?? null,
  maintenancePlanDistance:    row.maintenancePlanDistance      ?? null,
  maintenancePlanYears:       row.maintenancePlanYears         ?? null,
  serviceIntervalDistance:    row.serviceIntervalDistance      ?? null,
  serviceIntervalDistance1:   row.serviceIntervalDistance1      ?? null,
});

/** Maps a raw modeltable row returned by the embedded-join fallback. */
const mapRow = (row) => {
  const price = row.pricetable?.[0]       ?? {};
  const ep    = row.performancetable?.[0] ?? {};
  const dim   = row.dimensiontable?.[0]   ?? {};
  const tow   = row.towingtable?.[0]      ?? {};
  const safety = row.safetytable?.[0]     ?? {};
  const extras = row.extrastable?.[0]     ?? {};
  const service = row.servicetable?.[0]   ?? {};
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
    tankSize:                   ep.TankSize                                   ?? null,
    steering:                   ep.Steering                                   ?? null,
    drivenWheels:               ep.DrivenWheels                               ?? null,
    gearRatios:                 ep.GearRatios                                 ?? null,
    length:                     dim.Length                                    ?? null,
    width:                      dim.width_excl_mirrors != null
                                  ? String(dim.width_excl_mirrors)            : null,
    widthExclMirrorsInclMirrors: formatRange(dim.width_excl_mirrors, dim.width_incl_mirrors),
    height:                     dim.height                                    ?? null,
    wheelbase:                  dim.wheelbase != null
                                  ? String(dim.wheelbase)                     : null,
    groundClearance:            dim.ground_clearance                          ?? null,

    // Towing & Mass
    towingBraked:               tow.towingBraked                              ?? null,
    towingUnbraked:             tow.towingUnbraked                            ?? null,
    kerbWeight:                 tow.kerbWeight                                ?? null,
    gvm:                        tow.gvm                                       ?? null,
    loadVolume:                 tow.loadVolume                                ?? null,
    dryWeight:                  tow.dryWeight                                 ?? null,
    payloadCapacity:            tow.payloadCapacity                           ?? null,
    towbarFitted:               tow.towbarFitted                              ?? null,
    wadingDepth:                tow.wadingDepth                               ?? null,

    // Safety
    airbagQuantity:             safety.airbagQuantity                          ?? null,
    driverAirbag:               safety.driverAirbag                            ?? null,
    frontPassengerAirbag:       safety.frontPassengerAirbag                    ?? null,
    driverKneeAirbag:           safety.driverKneeAirbag                        ?? null,
    passengerKneeAirbag:        safety.passengerKneeAirbag                     ?? null,
    frontSideAirbags:           safety.frontSideAirbags                       ?? null,
    rearSideAirbags:            safety.rearSideAirbags                        ?? null,
    curtainAirbags:             safety.curtainAirbags                         ?? null,
    childProofSafetyLock:       safety.childProofSafetyLock                   ?? null,
    isofixMountings:            safety.isofixMountings                        ?? null,
    collisionWarning:           safety.collisionWarning                       ?? null,

    // Extras
    airConditioning:            extras.airConditioning                        ?? null,
    rearAirConditioningControls: extras.rearAirConditioningControls           ?? null,
    powerSteering:              extras.powerSteering                          ?? null,
    electricPowerSteering:      extras.electricPowerSteering                  ?? null,
    leatherSteeringWheelRim:    extras.leatherSteeringWheelRim                ?? null,
    multiFunctionSteeringWheelControls: extras.multiFunctionSteeringWheelControls ?? null,
    laneDepartureWarning:       extras.laneDepartureWarning                   ?? null,
    attentionAssist:            extras.attentionAssist                        ?? null,
    headUpDisplay:              extras.headUpDisplay                          ?? null,
    controlsScreenInputMethod:  extras.controlsScreenInputMethod              ?? null,
    navigation:                 extras.navigation                             ?? null,
    cruiseControl:              extras.cruiseControl                          ?? null,
    adaptiveCruiseControl:      extras.adaptiveCruiseControl                  ?? null,
    bluetooth:                  extras.bluetooth                              ?? null,
    usbPort:                    extras.usbPort                                ?? null,
    electricWindows:            extras.electricWindows                        ?? null,
    heatedRearScreen:           extras.heatedRearScreen                       ?? null,
    autoDimExteriorMirrors:     extras.autoDimExteriorMirrors                 ?? null,
    suedeClothUpholstery:       extras.suedeClothUpholstery                   ?? null,
    leatherUpholstery:          extras.leatherUpholstery                      ?? null,
    lumbarSupportAdjustment:    extras.lumbarSupportAdjustment                ?? null,
    electricDriverSeat:         extras.electricDriverSeat                     ?? null,
    electricSeatMemory:         extras.electricSeatMemory                     ?? null,
    frontVentilatedSeats:       extras.frontVentilatedSeats                   ?? null,

    // Service & Warranty
    warrantyYears:              service.warrantyYears                         ?? null,
    warrantyDistance:           service.warrantyDistance                      ?? null,
    serviceMaintenancePlan:     service.serviceMaintenancePlan                ?? null,
    servicePlanYears:           service.servicePlanYears                      ?? null,
    servicePlanDistance:        service.servicePlanDistance                   ?? null,
    maintenancePlan:            service.maintenancePlan                       ?? null,
    maintenancePlanYears:       service.maintenancePlanYears                  ?? null,
    maintenancePlanDistance:    service.maintenancePlanDistance               ?? null,
    serviceIntervalDistance:    service.serviceIntervalDistance               ?? null,
    serviceIntervalDistance1:    service.serviceIntervalDistance1               ?? null,
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
