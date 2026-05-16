import { createClient } from "@supabase/supabase-js";


/**
 * Supabase client.
 * Required environment variables:
 *   SUPABASE_URL  – e.g. https://xxxx.supabase.co
 *   SUPABASE_KEY  – your anon or service-role key
 *
 * Depends on:
 *   - View:     public.vehicle_view      (see schema setup instructions)
 *   - Function: public.brands_with_count (see schema setup instructions)
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

export const vehicleRepository = {
  /**
   * Returns a flat list of all brand names, alphabetically sorted.
   */
  async getAllBrands() {
    const { data, error } = await supabase
      .from("BrandTable")
      .select("BrandNames")
      .order("BrandNames");

    if (error) throw error;
    return data.map((row) => row.BrandNames);
  },

  /**
   * Returns brand names that contain the given query string (case-insensitive).
   */
  async searchBrands(query) {
    const { data, error } = await supabase
      .from("BrandTable")
      .select("BrandNames")
      .ilike("BrandNames", `%${query}%`)
      .order("BrandNames");

    if (error) throw error;
    return data.map((row) => row.BrandNames);
  },

  /**
   * Returns each brand name alongside the number of models it has.
   * Calls the `brands_with_count` Postgres function (see setup instructions).
   */
  async getBrandsWithCount() {
    const { data, error } = await supabase.rpc("brands_with_count");

    if (error) throw error;
    return data; // [{ name: "Toyota", count: 12 }, ...]
  },

  /**
   * Returns distinct model names for a given brand, alphabetically sorted.
   */
  async getModelsByBrand(brand) {
    const { data, error } = await supabase
      .from("vehicle_view")
      .select("model")
      .eq("brand", brand)
      .order("model");

    if (error) throw error;
    return [...new Set(data.map((row) => row.model))];
  },

  /**
   * Returns model names for a given brand that match the query string.
   */
  async searchModelsByBrand(brand, query) {
    const { data, error } = await supabase
      .from("vehicle_view")
      .select("model")
      .eq("brand", brand)
      .ilike("model", `%${query}%`)
      .order("model");

    if (error) throw error;
    return [...new Set(data.map((row) => row.model))];
  },

  /**
   * Returns the full vehicle detail row for a specific brand + model combination.
   * Returns null if not found.
   */
  async getVehicleDetails(brand, model) {
    const { data, error } = await supabase
      .from("vehicle_view")
      .select("*")
      .eq("brand", brand)
      .eq("model", model)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Returns the full vehicle detail row for a given modelId.
   * Returns null if not found.
   */
  async getVehicleByModelId(modelId) {
    const { data, error } = await supabase
      .from("vehicle_view")
      .select("*")
      .eq("modelId", modelId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Searches vehicles with optional brand and/or model filters.
   * Returns up to `limit` results (default 25), ordered by brand then model.
   */
  async searchVehicles({ brand, model, limit = 25 }) {
    let query = supabase
      .from("vehicle_view")
      .select("*")
      .order("brand")
      .order("model")
      .limit(limit);

    if (brand) query = query.eq("brand", brand);
    if (model) query = query.eq("model", model);

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },
};