import { vehicleService } from "../services/vehicle.service.js";

const mapFieldSet = (vehicles, fields) =>
  vehicles.map((vehicle) =>
    fields.reduce((result, field) => {
      result[field] = vehicle[field];
      return result;
    }, {}),
  );

const getVehicles = (limit = 50) => vehicleService.searchVehicles({ limit });

export const modelsController = {
  async getAllBrands(req, res) {
    res.json(await vehicleService.getAllBrands());
  },

  async getBrandsWithCount(req, res) {
    res.json(await vehicleService.getBrandsWithCount());
  },

  async getRanges(req, res) {
    const vehicles = await getVehicles();
    res.json(mapFieldSet(vehicles, ["brand", "model", "fuelRange"]));
  },

  async getPrices(req, res) {
    const vehicles = await getVehicles();
    res.json(mapFieldSet(vehicles, ["brand", "model", "price", "priceStatus"]));
  },

  async getEngines(req, res) {
    const vehicles = await getVehicles();
    res.json(mapFieldSet(vehicles, ["brand", "model", "engine", "cylinders"]));
  },

  async getPerformanceList(req, res) {
    const vehicles = await getVehicles();
    res.json(
      mapFieldSet(vehicles, [
        "brand",
        "model",
        "topSpeed",
        "acceleration",
        "power",
        "torque",
      ]),
    );
  },

  async getModelById(req, res) {
    res.json(await vehicleService.getVehicleByModelId(Number(req.params.id)));
  },

  async searchModels(req, res) {
    const vehicles = await vehicleService.searchVehicles({ limit: 25 });
    const query = (req.query.q || "").toLowerCase();
    const filtered = vehicles
      .filter((vehicle) => vehicle.model.toLowerCase().includes(query))
      .map((vehicle) => vehicle.model);

    res.json([...new Set(filtered)]);
  },

  async searchBrands(req, res) {
    res.json(await vehicleService.searchBrands(req.query.q || ""));
  },

  async searchModelsByBrand(req, res) {
    res.json(
      await vehicleService.searchModelsByBrand(
        req.query.brand,
        req.query.q || "",
      ),
    );
  },

  async getModelsByBrand(req, res) {
    res.json(await vehicleService.getModelsByBrand(req.query.brand));
  },

  async searchVehicles(req, res) {
    res.json(
      await vehicleService.searchVehicles({
        brand: req.query.brand,
        model: req.query.model,
        limit: 25,
      }),
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

  async getDimensions(req, res) {
    res.json(
      await vehicleService.getDimensions(req.params.brand, req.params.model),
    );
  },

  async getPrice(req, res) {
    res.json(await vehicleService.getPrice(req.query.brand, req.query.model));
  },

  async getEngine(req, res) {
    res.json(await vehicleService.getEngine(req.query.brand, req.query.model));
  },

  async getRange(req, res) {
    const performance = await vehicleService.getPerformance(
      req.query.brand,
      req.query.model,
    );

    res.json({
      brand: performance.brand,
      model: performance.model,
      fuelRange: performance.fuelRange,
    });
  },

  async getCarStats(req, res) {
    res.json(
      await vehicleService.getPerformance(req.params.brand, req.params.model),
    );
  },

  async getCarStatsBatch(req, res) {
    const results = await Promise.all(
      req.body.map((entry) =>
        vehicleService.getPerformance(entry.brand, entry.model),
      ),
    );

    res.json(results);
  },

  async getVehicleData(req, res) {
    const data = await vehicleService.getVehicleData(req.body);
    res.json({
      success: true,
      count: data.length,
      data,
    });
  },
};
