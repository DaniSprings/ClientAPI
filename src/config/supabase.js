import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "./env.js";
import { HttpError } from "../utils/http-error.js";

let supabaseClient = null;

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    throw new HttpError(
      503,
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in car-api/.env.",
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: env.supabaseSchema,
      },
    });
  }

  return supabaseClient;
};

export const getSupabaseHealth = async () => {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      message: "Supabase environment variables are not configured.",
    };
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from(env.supabaseAcquiredTable)
      .select("*", { count: "exact", head: true })
      .limit(1);

    if (error) {
      return {
        configured: true,
        connected: false,
        message: error.message,
      };
    }

    return {
      configured: true,
      connected: true,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      message: error.message,
    };
  }
};
