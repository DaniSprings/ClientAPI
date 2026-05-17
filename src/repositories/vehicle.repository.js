import { createClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase.js";

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
/*const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);*/



import { getSupabaseClient } from "../config/supabase.js"; // adjust path if needed

export const vehicleRepository = {
  async getAllBrands() {
    const supabase = getSupabaseClient(); // ✅ uses the shared configured client
    const { data, error } = await supabase
      .from("BrandTable")
      .select("BrandNames")
      .order("BrandNames");

    if (error) throw error;
    return data.map((row) => row.BrandNames);
  },

  async searchBrands(query) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("BrandTable")
      .select("BrandNames")
      .ilike("BrandNames", `%${query}%`)
      .order("BrandNames");

    if (error) throw error;
    return data.map((row) => row.BrandNames);
  },

  async getBrandsWithCount() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("brands_with_count");
    if (error) throw error;
    return data;
  },

  async getModelsByBrand(brand) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("vehicle_view")
      .select("model")
      .eq("brand", brand)
      .order("model");

    if (error) throw error;
    return [...new Set(data.map((row) => row.model))];
  },

  async searchModelsByBrand(brand, query) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("vehicle_view")
      .select("model")
      .eq("brand", brand)
      .ilike("model", `%${query}%`)
      .order("model");

    if (error) throw error;
    return [...new Set(data.map((row) => row.model))];
  },

  async getVehicleDetails(brand, model) {
    const supabase = getSupabaseClient();
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

  async getVehicleByModelId(modelId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("vehicle_view")
      .select("*")
      .eq("modelId", modelId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async searchVehicles({ brand, model, limit = 25 }) {
    const supabase = getSupabaseClient();
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