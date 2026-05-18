import { env } from env.js';
/**
 * supabaseVehicleService.js
 *
 * Frontend service that calls the backend API routes for all
 * Supabase-backed vehicle and brand data. This is the bridge
 * between CarStats.jsx (and other components) and the Node API,
 * which in turn talks to Supabase via vehicleRepository.
 *
 * All methods return plain JS values (arrays / objects / null)
 * so callers never have to unwrap { data, error } themselves.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'https://clientapi-production-01e4.up.railway.app';

/**
 * Thin fetch wrapper — throws a descriptive Error on non-2xx responses.
 */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status} on ${path}: ${body}`);
  }

  return res.json();
}

export const supabaseVehicleService = {
  /**
   * Returns all brand names as a plain string array.
   * e.g. ['Audi', 'BMW', 'Toyota', ...]
   */
  async getAllBrands() {
    try {
      const data = await apiFetch('/api/cars/brands');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('[supabaseVehicleService] getAllBrands failed:', err);
      return [];
    }
  },

  /**
   * Returns brands with their vehicle counts from the
   * brands_with_count RPC, shaped as [{ name, count }].
   *
   * CarStats.jsx maps over this with `brand.name`, so we
   * normalise the field name here regardless of what the
   * RPC returns (BrandNames, brand_name, name, etc.).
   */
  async getBrandsWithCount() {
    try {
      const data = await apiFetch('/api/cars/brands');

      if (!Array.isArray(data) || data.length === 0) return [];

      // Normalise to { name } so CarStats.jsx's `brand.name` always works
      return data.map((item) => ({
        name:
          item.name ||          // already correct
          item.BrandNames ||    // PascalCase from BrandTable
          item.brand_name ||    // snake_case variant
          item.brandName ||     // camelCase variant
          String(item),         // last resort
        count: item.count ?? item.vehicle_count ?? item.vehicleCount ?? 0,
      }));
    } catch (err) {
      console.error('[supabaseVehicleService] getBrandsWithCount failed:', err);
      return [];
    }
  },

  /**
   * Returns a deduplicated array of model name strings for a given brand.
   * e.g. ['A3', 'A4', 'Q5', ...]
   */
  async getModelsByBrand(brand) {
    if (!brand) return [];

    try {
      const data = await apiFetch(
        `/api/cars/models?brand=${encodeURIComponent(brand)}`
      );
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(`[supabaseVehicleService] getModelsByBrand(${brand}) failed:`, err);
      return [];
    }
  },

  /**
   * Searches models by brand + partial query string.
   */
  async searchModelsByBrand(brand, query) {
    if (!brand) return [];

    try {
      const data = await apiFetch(
        `/api/cars/models/search?brand=${encodeURIComponent(brand)}&q=${encodeURIComponent(query || '')}`
      );
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(`[supabaseVehicleService] searchModelsByBrand failed:`, err);
      return [];
    }
  },

  /**
   * Core lookup used by CarStats.jsx's fetchVehicleRecord.
   *
   * Accepts EITHER:
   *   findVehicleByBrandModel({ brand, model })   ← object form (what CarStats passes)
   *   findVehicleByBrandModel(brand, model)        ← two-arg form (legacy)
   *
   * Returns the vehicle record object, or null if not found.
   */
  async findVehicleByBrandModel(brandOrObj, modelArg) {
    // Normalise both call signatures
    const brand =
      typeof brandOrObj === 'object' && brandOrObj !== null
        ? brandOrObj.brand
        : brandOrObj;
    const model =
      typeof brandOrObj === 'object' && brandOrObj !== null
        ? brandOrObj.model
        : modelArg;

    if (!brand || !model) {
      console.warn('[supabaseVehicleService] findVehicleByBrandModel: missing brand or model', { brand, model });
      return null;
    }

    try {
      const data = await apiFetch(
        `/api/cars/details?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`
      );

      // Backend returns null / empty object when not found
      if (!data || Object.keys(data).length === 0) return null;

      return { ...data, dataSource: 'Supabase' };
    } catch (err) {
      console.error(`[supabaseVehicleService] findVehicleByBrandModel(${brand}, ${model}) failed:`, err);
      return null;
    }
  },

  /**
   * Full-text / filtered vehicle search.
   * Returns an array of vehicle records.
   */
  async searchVehicles({ brand, model, limit = 25 } = {}) {
    try {
      const params = new URLSearchParams();
      if (brand) params.set('brand', brand);
      if (model) params.set('model', model);
      if (limit) params.set('limit', limit);

      const data = await apiFetch(`/api/cars/all?${params.toString()}`);
      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch (err) {
      console.error('[supabaseVehicleService] searchVehicles failed:', err);
      return [];
    }
  },
};