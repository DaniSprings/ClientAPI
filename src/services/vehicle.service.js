import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { HttpError } from "../utils/http-error.js";
import { buildAutoCorrectResult, rankSuggestions } from "../utils/search.js";

const mapVehicle = (row) => ({
  ...row,
  id: `${row.brandId}-${row.modelId}`,
  dimensions: {
    length: row.length,
    width: row.width,
    widthExclMirrorsInclMirrors: row.widthExclMirrorsInclMirrors || row.width,
    height: row.height,
    wheelbase: row.wheelbase,
    groundClearance: row.groundClearance,
  },
});

const ensureVehicle = (vehicle, brand, model) => {
  if (!vehicle) {
    throw new HttpError(404, `No vehicle data found for ${brand} ${model}.`);
  }

  return mapVehicle(vehicle);
};

export const vehicleService = {
  async getAllBrands() {
    return vehicleRepository.getAllBrands();
  },

  async searchBrands(query) {
    return vehicleRepository.searchBrands(query);
  },

  async getBrandAutoCorrect(query) {
    const brands = await vehicleRepository.getAllBrands();
    const suggestions = rankSuggestions(query, brands);
    return buildAutoCorrectResult(query, suggestions);
  },

  async getBrandsWithCount() {
    const brands = await vehicleRepository.getBrandsWithCount();
    return brands.map((brand) => ({
      name: brand.name,
      count: brand.count,
      image: "",
    }));
  },

  async getModelsByBrand(brand) {
    return vehicleRepository.getModelsByBrand(brand);
  },

  async searchModelsByBrand(brand, query) {
    return vehicleRepository.searchModelsByBrand(brand, query);
  },

  async getModelAutoCorrect(brand, query) {
    const models = await vehicleRepository.getModelsByBrand(brand);
    const suggestions = rankSuggestions(query, models);
    return buildAutoCorrectResult(query, suggestions);
  },

  async getVehicleDetails(brand, model) {
    const vehicle = await vehicleRepository.getVehicleDetails(brand, model);
    return ensureVehicle(vehicle, brand, model);
  },

  async getVehicleByModelId(modelId) {
    const vehicle = await vehicleRepository.getVehicleByModelId(modelId);

    if (!vehicle) {
      throw new HttpError(
        404,
        `No vehicle data found for model id ${modelId}.`,
      );
    }

    return mapVehicle(vehicle);
  },

  async searchVehicles(filters = {}) {
    const vehicles = await vehicleRepository.searchVehicles(filters);
    return vehicles.map(mapVehicle);
  },

  async getVehicleYears() {
    return [];
  },

  async getVehicleData(filters) {
    const vehicles = await this.searchVehicles(filters);
    return vehicles;
  },

  async getPrice(brand, model) {
    const vehicle = await this.getVehicleDetails(brand, model);
    return {
      brand: vehicle.brand,
      model: vehicle.model,
      price: vehicle.price,
    };
  },

  async getEngine(brand, model) {
    const vehicle = await this.getVehicleDetails(brand, model);
    return {
      brand: vehicle.brand,
      model: vehicle.model,
      engine: vehicle.engine,
      cylinders: vehicle.cylinders,
      power: vehicle.power,
      torque: vehicle.torque,
    };
  },

  async getPerformance(brand, model) {
    const vehicle = await this.getVehicleDetails(brand, model);
    return {
      brand: vehicle.brand,
      model: vehicle.model,
      topSpeed: vehicle.topSpeed,
      acceleration: vehicle.acceleration,
      fuelConsumption: vehicle.fuelConsumption,
      fuelRange: vehicle.fuelRange,
      fuel: vehicle.fuel,
      tankSize: vehicle.tankSize,
      power: vehicle.power,
      torque: vehicle.torque,
      steering: vehicle.steering,
      drivenWheels: vehicle.drivenWheels,
      gearRatios: vehicle.gearRatios,
    };
  },

  async getDimensions(brand, model) {
    const vehicle = await this.getVehicleDetails(brand, model);
    return vehicle.dimensions;
  },
  async getTowing(brand, model) {
    const vehicle = await this.getVehicleDetails(brand, model);
    return {
      brand: vehicle.brand,
      model: vehicle.model,
      towbar: vehicle.towbar,
      waterdepth: vehicle.waterdepth,
      loadVolume: vehicle.loadVolume,
      weight_eu: vehicle.weight_eu,
      weight_din: vehicle.weight_din,
      payload: vehicle.payload,
      load_capacity: vehicle.load_capacity,
      gvm: vehicle.gvm,
      towing_unbraked: vehicle.towing_unbraked,
      towing_braked: vehicle.towing_braked,
    };
  },
  async getSafety(brand, model) {
    const vehicle = await this.getVehicleDetails(brand, model);
    return {
      brand: vehicle.brand,
      model: vehicle.model,
      airbagQuantity: vehicle.airbagQuantity,
      driverAirbag: vehicle.driverAirbag,
      frontPassengerAirbag: vehicle.frontPassengerAirbag,
      driverKneeAirbag: vehicle.driverKneeAirbag,
      passengerKneeAirbag: vehicle.passengerKneeAirbag,
      frontSideAirbags: vehicle.frontSideAirbags,
      rearSideAirbags: vehicle.rearSideAirbags,
      curtainAirbags: vehicle.curtainAirbags,
      childProofSafetyLock: vehicle.childProofSafetyLock,
      isofixMountings: vehicle.isofixMountings,
      collisionWarning: vehicle.collisionWarning,
    };
  },

};
