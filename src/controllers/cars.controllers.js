import { vehicleService } from "../services/vehicle.service.js";
import { HttpError } from "../utils/http-error.js";

export const carsController = {
  async getBrands(req, res) {
    res.json(await vehicleService.getAllBrands());
  },

  async searchBrands(req, res) {
    res.json(await vehicleService.searchBrands(req.query.q || ""));
  },

  async getBrandAutoCorrect(req, res) {
    res.json(await vehicleService.getBrandAutoCorrect(req.query.q || ""));
  },

  async getModels(req, res) {
    res.json(await vehicleService.getModelsByBrand(req.query.brand));
  },

  async searchModels(req, res) {
    res.json(
      await vehicleService.searchModelsByBrand(
        req.query.brand,
        req.query.q || "",
      ),
    );
  },

  async getModelAutoCorrect(req, res) {
    res.json(
      await vehicleService.getModelAutoCorrect(
        req.query.brand,
        req.query.q || "",
      ),
    );
  },

  async getYears(req, res) {
    res.json(
      await vehicleService.getVehicleYears(req.query.brand, req.query.model),
    );
  },

  async getDetails(req, res) {
    res.json(
      await vehicleService.getVehicleDetails(req.query.brand, req.query.model),
    );
  },

  async getAllVehicles(req, res) {
    res.json(
      await vehicleService.searchVehicles({
        brand: req.query.brand,
        model: req.query.model,
        limit: 25,
      }),
    );
  },
};

export const getCars = carsController.getAllVehicles;

export const getCarById = async (req, res) => {
  res.json(await vehicleService.getVehicleByModelId(Number(req.params.id)));
};

export const createCar = async () => {
  throw new HttpError(
    501,
    "Vehicle creation is not implemented for the normalized SQL schema.",
  );
};
