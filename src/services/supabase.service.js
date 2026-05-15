import { env } from "../config/env.js";
import { supabaseRepository } from "../repositories/supabase.repository.js";

export const supabaseService = {
  async getAcquiredData(limit = 100) {
    const rows = await supabaseRepository.readTableRows({
      tableName: env.supabaseAcquiredTable,
      limit,
    });

    return {
      table: env.supabaseAcquiredTable,
      count: rows.length,
      rows,
    };
  },

  async getTableData(tableName, limit = 100) {
    const rows = await supabaseRepository.readTableRows({
      tableName,
      limit,
    });

    return {
      table: tableName,
      count: rows.length,
      rows,
    };
  },
};
