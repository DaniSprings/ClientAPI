import { env } from "./env.js";
import {createClient} from "@supabase/supabase-js";
import { env, isDatabaseConfigured } from "./env.js";
import { HttpError } from "../utils/http-error.js";

let _adminClient = null;
let _anonClient = null;

/**
 * Admin client — uses the service role key to bypass Row Level Security.
 * Use for all server-side data operations and admin auth actions.
 */
export const getSupabase = () => {
  if (!isDatabaseConfigured()) {
    throw new HttpError(
      503,
      "Database configuration is missing. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to car-api/.env",
    );
  }

  if (!_adminClient) {
    _adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return _adminClient;
};

/**
 * Anon client — uses the public anon key.
 * Required for signInWithPassword (must use the anon key, not the service role).
 */
export const getAnonSupabase = () => {
  if (!_anonClient) {
    _anonClient = createClient(
      env.supabaseUrl || "http://localhost",
      env.supabaseAnonKey || "anon",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  return _anonClient;
};

export const executeQuery = async (queryBuilder) => {
  const pool = await getPool();
  const request = pool.request();
  return queryBuilder(request, sqlClient);
};

export const getDatabaseHealth = async () => {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      message: "Supabase environment variables are not configured.",
    };
  }

   try {
    const db = getSupabase();
    const { error } = await db
      .from("brand_table")
      .select("brand_id")
      .limit(1);

    if (error) throw error;

    return { configured: true, connected: true };
  } catch (error) {
    return { configured: true, connected: false, message: error.message };
  }
};
