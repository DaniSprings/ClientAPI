import { getSupabaseClient } from "../config/supabase.js";
import { HttpError } from "../utils/http-error.js";

const TABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const normalizeLimit = (limit) => {
  const parsed = Number.parseInt(String(limit ?? "100"), 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 100;
  }

  return Math.min(parsed, 500);
};

const assertTableName = (tableName) => {
  if (!TABLE_NAME_PATTERN.test(tableName)) {
    throw new HttpError(400, "Invalid table name.");
  }
};

export const supabaseRepository = {
  async readTableRows({ tableName, limit = 100 }) {
    assertTableName(tableName);

    const safeLimit = normalizeLimit(limit);
    const client = getSupabaseClient();

    const { data, error } = await client
      .from(tableName)
      .select("*")
      .limit(safeLimit);

    if (error) {
      throw new HttpError(502, `Supabase read failed: ${error.message}`);
    }

    return data || [];
  },
};
