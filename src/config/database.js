import { createClient } from "@supabase/supabase-js";
import { env, isDatabaseConfigured, isReadDatabaseConfigured } from "./env.js";
import { HttpError } from "../utils/http-error.js";

let _adminClient = null;
let _readClient = null;

/**
 * Admin client — uses the service role key to bypass Row Level Security.
 * Use for all server-side data operations and admin auth actions.
 */
export const getSupabase = () => {
  if (!isDatabaseConfigured()) {
    throw new HttpError(
      503,
      "Admin Supabase configuration is missing. Add a real SUPABASE_SERVICE_ROLE_KEY to car-api/.env for signup, profile, and search-history operations.",
    );
  }

  if (!_adminClient) {
    _adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return _adminClient;
};

export const getReadSupabase = () => {
  if (!isReadDatabaseConfigured()) {
    throw new HttpError(
      503,
      "Read-only Supabase configuration is missing. Add SUPABASE_URL and SUPABASE_ANON_KEY to car-api/.env",
    );
  }

  if (!_readClient) {
    _readClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return _readClient;
};

/**
 * Anon client — uses the public anon key.
 * Required for signInWithPassword (must use the anon key, not the service role).
 */
export const getAnonSupabase = () => {
  return getReadSupabase();
};

export const getDatabaseHealth = async () => {
  if (!isReadDatabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      readConfigured: false,
      adminConfigured: isDatabaseConfigured(),
      adminConnected: false,
      message: "Supabase environment variables are not configured for read access.",
    };
  }

  try {
    const readDb = getReadSupabase();
    let readError = null;

    for (const probe of [
      () => readDb.from("vehicle_view").select("modelId").limit(1),
      () => readDb.from("brand_table").select("brand_id").limit(1),
      () => readDb.from("brandtable").select("Brand_ID").limit(1),
    ]) {
      const { error } = await probe();
      if (!error) {
        readError = null;
        break;
      }

      readError = error;
    }

    if (readError) throw readError;

    let adminConnected = false;
    let message = null;

    if (isDatabaseConfigured()) {
      const adminDb = getSupabase();
      const { error } = await adminDb.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) {
        message = error.message;
      } else {
        adminConnected = true;
      }
    } else {
      message = "Read-only queries are available, but admin auth operations need a real SUPABASE_SERVICE_ROLE_KEY.";
    }

    return {
      configured: true,
      connected: true,
      readConfigured: true,
      readConnected: true,
      adminConfigured: isDatabaseConfigured(),
      adminConnected,
      ...(message ? { message } : {}),
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      readConfigured: true,
      readConnected: false,
      adminConfigured: isDatabaseConfigured(),
      adminConnected: false,
      message: error.message,
    };
  }
};
