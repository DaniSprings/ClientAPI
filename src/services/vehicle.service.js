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
      power: vehicle.power,
      torque: vehicle.torque,
      Steering: vehicle.Steering,
      DrivenWheels: vehicle.DrivenWheels,
      GearRatios: vehicle.GearRatios,
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
      weight: vehicle.weight,
      curbWeight: vehicle.curbWeight,
      grossVehicleWeight: vehicle.grossVehicleWeight,
    };
  },
   async getSafety(brand, model) {
    const vehicle = await this.getVehicleDetails(brand, model);
    return {
      brand: vehicle.brand,
      model: vehicle.model,
      airbags: vehicle.airbags,
      abs: vehicle.abs,
      isoFix_mountings: vehicle.ISOFIXSeatMountings,
      tractionControl: vehicle.tractionControl,
      stabilityControl: vehicle.stabilityControl,
    };
  },

};
