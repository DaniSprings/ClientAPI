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

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

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
  "performancetable ( EngineType, Cylinders, Fuel, Power, Torque, Acceleration, TopSpeed, fuelConsumption, fuelRange, tankSize, Steering, DrivenWheels, GearRatios )",
  "dimensiontable ( Length, width, width_incl_mirrors, height, wheelbase, ground_clearance )",
  "towingtable ( towbarFitted, wadingDepth:\"wading depth\", loadVolume:\"load volume / capacity\", dryWeight:\"Dry weight (DIN)\", kerbWeight:\"Kerb weight (EU)\", payloadCapacity:\"load carrying capacity / payload\", gvm:\"gross weight (GVM)\", towingUnbraked:\"towing capacity - unbraked\", towingBraked:\"towing capacity - braked\" )",
  "safetytable ( driverAirbag:driverairbag, frontPassengerAirbag:front_passenger_airbag, driverKneeAirbag:driver_knee_airbag, passengerKneeAirbag:passenger_knee_airbag, frontSideAirbags:front_side_airbags, rearSideAirbags:rear_side_airbags, curtainAirbags:curtain_airbags, airbagQuantity:airbag_quantity, childProofSafetyLock:childlock, isofixMountings:isofix_mountings, collisionWarning:collision_warning_brake )",
  "extrastable ( airConditioning:\"air conditioning\", rearAirConditioningControls:\"4-zone / rear air-conditioning controls\", powerSteering:\"power steering\", electricPowerSteering:\"electric power steering\", leatherSteeringWheelRim:\"leather steering wheel rim\", multiFunctionSteeringWheelControls:\"multi-function steering wheel controls\", laneDepartureWarning:\"lane departure warning\", attentionAssist:\"attention assist / rest assist / break alert / fatigue detectio\", headUpDisplay:\"head-up display\", controlsScreenInputMethod:\"controls screen input method\", navigation:\"navigation\", cruiseControl:\"cruise control\", adaptiveCruiseControl:\"active/adaptive cruise control\", bluetooth:\"Bluetooth connectivity\", usbPort:\"USB port\", electricWindows:\"electric windows\", heatedRearScreen:\"heated rear screen / rear demister\", autoDimExteriorMirrors:\"autodim exterior mirrors\", suedeClothUpholstery:\"suede-cloth upholstery\", leatherUpholstery:\"leather upholstery\", lumbarSupportAdjustment:\"lumbar support adjustment\", electricDriverSeat:\"electric seat adjustment - driver\", electricSeatMemory:\"memory for electric seat adjustment\", frontVentilatedSeats:\"ventilated seats - front\" )",
  "servicetable ( warrantyYears:\"warranty time (years)\", warrantyDistance:\"warranty distance\", serviceMaintenancePlan:\"service/maintenance plan\", servicePlanYears:\"service plan time (years)\", servicePlanDistance:\"service plan distance\", maintenancePlan:\"maintenance plan\", maintenancePlanYears:\"maintenance plan time (years)\", maintenancePlanDistance:\"maintenance plan distance\", serviceIntervalDistance:\"service interval distance\", serviceIntervalDistance1:\"service interval distance_1\" )",

].join(", ");

// ─── Row mappers ─────────────────────────────────────────────────────────────

/**
 * Maps a row returned by vehicle_view (flat columns, camelCase) when that
 * compatibility view exists.
 *
 * priceStatus / priceExclEmissionsTax are intentionally NOT mapped:
 * pricetable only exposes ID, MODEL_ID, and Price in the normalized schema.
 */
const mapVehicleViewRow = (row) => ({
  brandId:                    firstDefined(row.brandId, row.brand_id, row.Brand_ID) ?? null,
  brand:                      firstDefined(row.brand, row.BrandNames, row.brand_name) ?? null,
  modelId:                    firstDefined(row.modelId, row.model_id, row.MODEL_ID),
  model:                      firstDefined(row.model, row.ModelNames, row.model_name),
  bodyShape:                  firstDefined(row.bodyShape, row.body_shape, row.BodyShape) ?? null,
  price:                      firstDefined(row.price, row.Price) ?? null,
  engine:                     firstDefined(row.engine, row.EngineType) ?? null,
  cylinders:                  firstDefined(row.cylinders, row.Cylinders) ?? null,
  fuel:                       firstDefined(row.fuel, row.Fuel) ?? null,
  power:                      firstDefined(row.power, row.Power) ?? null,
  torque:                     firstDefined(row.torque, row.Torque) ?? null,
  acceleration:               firstDefined(row.acceleration, row.Acceleration) ?? null,
  topSpeed:                   firstDefined(row.topSpeed, row.TopSpeed) ?? null,
  fuelConsumption:            firstDefined(row.fuelConsumption, row.fuel_consumption) ?? null,
  fuelRange:                  firstDefined(row.fuelRange, row.fuel_range) ?? null,
  tankSize:                   firstDefined(row.tankSize, row.tank_size) ?? null,
  steering:                   firstDefined(row.steering, row.Steering) ?? null,
  drivenWheels:               firstDefined(row.drivenWheels, row.DrivenWheels) ?? null,
  gearRatios:                 firstDefined(row.gearRatios, row.GearRatios) ?? null,
  length:                     firstDefined(row.length, row.Length) ?? null,
  width:                      firstDefined(row.widthExclMirrors, row.width, row.width_excl_mirrors) ?? null,
  widthExclMirrors:           firstDefined(row.widthExclMirrors, row.width_excl_mirrors, row.width) ?? null,
  widthInclMirrors:           firstDefined(row.widthInclMirrors, row.width_incl_mirrors) ?? null,
  height:                     firstDefined(row.height, row.Height) ?? null,
  wheelbase:                  firstDefined(row.wheelbase, row.Wheelbase) ?? null,
  groundClearance:            firstDefined(row.groundClearance, row.ground_clearance) ?? null,

  // Towing & Mass
  towingBraked:               firstDefined(row.towingBraked, row.towing_braked) ?? null,
  towingUnbraked:             firstDefined(row.towingUnbraked, row.towing_unbraked) ?? null,
  kerbWeight:                 firstDefined(row.kerbWeight, row.kerb_weight) ?? null,
  gvm:                        firstDefined(row.gvm, row.GVM) ?? null,
  loadVolume:                 firstDefined(row.loadVolume, row.load_volume) ?? null,
  dryWeight:                  firstDefined(row.dryWeight, row.dry_weight) ?? null,
  payloadCapacity:            firstDefined(row.payloadCapacity, row.payload_capacity) ?? null,
  towbarFitted:               firstDefined(row.towbarFitted, row.towbar_fitted) ?? null,
  wadingDepth:                firstDefined(row.wadingDepth, row.wading_depth) ?? null,

  // Safety
  airbagQuantity:             firstDefined(row.airbagQuantity, row.airbag_quantity) ?? null,
  driverAirbag:               firstDefined(row.driverAirbag, row.driverairbag) ?? null,
  frontPassengerAirbag:       firstDefined(row.frontPassengerAirbag, row.front_passenger_airbag) ?? null,
  driverKneeAirbag:           firstDefined(row.driverKneeAirbag, row.driver_knee_airbag) ?? null,
  passengerKneeAirbag:        firstDefined(row.passengerKneeAirbag, row.passenger_knee_airbag) ?? null,
  frontSideAirbags:           firstDefined(row.frontSideAirbags, row.front_side_airbags) ?? null,
  rearSideAirbags:            firstDefined(row.rearSideAirbags, row.rear_side_airbags) ?? null,
  curtainAirbags:             firstDefined(row.curtainAirbags, row.curtain_airbags) ?? null,
  childProofSafetyLock:       firstDefined(row.childProofSafetyLock, row.childlock) ?? null,
  isofixMountings:            firstDefined(row.isofixMountings, row.isofix_mountings) ?? null,
  collisionWarning:           firstDefined(row.collisionWarning, row.collision_warning_brake, row.collision_warning) ?? null,

  // Extras
  airConditioning:            firstDefined(row.airConditioning, row.air_conditioning) ?? null,
  rearAirConditioningControls: firstDefined(row.rearAirConditioningControls, row.rear_air_conditioning_controls) ?? null,
  powerSteering:              firstDefined(row.powerSteering, row.power_steering) ?? null,
  electricPowerSteering:      firstDefined(row.electricPowerSteering, row.electric_power_steering) ?? null,
  leatherSteeringWheelRim:    firstDefined(row.leatherSteeringWheelRim, row.leather_steering_wheel_rim) ?? null,
  multiFunctionSteeringWheelControls: firstDefined(row.multiFunctionSteeringWheelControls, row.multi_function_steering_wheel_controls) ?? null,
  navigation:                 firstDefined(row.navigation, row.navigation_system) ?? null,
  cruiseControl:              firstDefined(row.cruiseControl, row.cruise_control) ?? null,
  adaptiveCruiseControl:      firstDefined(row.adaptiveCruiseControl, row.adaptive_cruise_control) ?? null,
  bluetooth:                  firstDefined(row.bluetooth, row.bluetooth_connectivity) ?? null,
  usbPort:                    firstDefined(row.usbPort, row.usb_port) ?? null,
  electricWindows:            firstDefined(row.electricWindows, row.electric_windows) ?? null,
  leatherUpholstery:          firstDefined(row.leatherUpholstery, row.leather_upholstery) ?? null,
  suedeClothUpholstery:       firstDefined(row.suedeClothUpholstery, row.suede_cloth_upholstery) ?? null,
  lumbarSupportAdjustment:    firstDefined(row.lumbarSupportAdjustment, row.lumbar_support_adjustment) ?? null,
  electricDriverSeat:         firstDefined(row.electricDriverSeat, row.electric_seat_adjustment_driver) ?? null,
  electricSeatMemory:         firstDefined(row.electricSeatMemory, row.memory_for_electric_seat_adjustment) ?? null,
  frontVentilatedSeats:       firstDefined(row.frontVentilatedSeats, row.front_ventilated_seats) ?? null,
  headUpDisplay:              firstDefined(row.headUpDisplay, row.head_up_display) ?? null,
  controlsScreenInputMethod:  firstDefined(row.controlsScreenInputMethod, row.controls_screen_input_method) ?? null,
  attentionAssist:            firstDefined(row.attentionAssist, row.attention_assist_rest_assist_break_alert_fatigue_detection) ?? null,
  laneDepartureWarning:       firstDefined(row.laneDepartureWarning, row.lane_departure_warning) ?? null,
  heatedRearScreen:           firstDefined(row.heatedRearScreen, row.heated_rear_screen_rear_demister) ?? null,
  autoDimExteriorMirrors:     firstDefined(row.autoDimExteriorMirrors, row.autodim_exterior_mirrors) ?? null,

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
  const price = row.pricetable?.[0] ?? {};
  const ep = row.performancetable?.[0] ?? {};
  const dim = row.dimensiontable?.[0] ?? {};
  const tow = row.towingtable?.[0] ?? {};
  const safety = row.safetytable?.[0] ?? {};
  const extras = row.extrastable?.[0] ?? {};
  const service = row.servicetable?.[0] ?? {};
  const brand = row.brandtable ?? {};

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
      // Fallback: raw embedded join across normalized tables
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
