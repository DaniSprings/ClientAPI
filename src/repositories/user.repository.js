import { getSupabase } from "../config/database.js";
import { HttpError } from "../utils/http-error.js";

const throwOnError = (error) => {
  if (error) {
    throw new HttpError(503, error.message);
  }
};

const mapProfile = (row) => {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    name: row.name,
    surname: row.surname,
    dateOfBirth: row.date_of_birth,
    occupation: row.occupation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const parseFilter = (filterJson) => {
  if (!filterJson) {
    return null;
  }

  if (typeof filterJson === "string") {
    return JSON.parse(filterJson);
  }

  return filterJson;
};

export const userRepository = {
  async createProfile({ userId, name, surname, dateOfBirth, occupation }) {
    const db = getSupabase();
    const { data, error } = await db
      .from("user_profile")
      .upsert(
        {
          user_id: userId,
          name,
          surname,
          date_of_birth: dateOfBirth || null,
          occupation: occupation || null,
        },
        { onConflict: "user_id" },
      )
      .select("user_id, name, surname, date_of_birth, occupation, created_at, updated_at")
      .single();

    throwOnError(error);
    return mapProfile(data);
  },

  async getProfile(userId) {
    const db = getSupabase();
    const { data, error } = await db
      .from("user_profile")
      .select("user_id, name, surname, date_of_birth, occupation, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    throwOnError(error);
    return mapProfile(data);
  },

  async updateProfile(userId, updates) {
    const db = getSupabase();
    const payload = {};

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.surname !== undefined) payload.surname = updates.surname;
    if (updates.occupation !== undefined) payload.occupation = updates.occupation;
    if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth;

    if (Object.keys(payload).length === 0) {
      return this.getProfile(userId);
    }

    const { data, error } = await db
      .from("user_profile")
      .update(payload)
      .eq("user_id", userId)
      .select("user_id, name, surname, date_of_birth, occupation, created_at, updated_at")
      .maybeSingle();

    throwOnError(error);
    return mapProfile(data);
  },

  async addSearchHistory(userId, searchTerm, filterJson) {
    const db = getSupabase();
    const { data, error } = await db
      .from("user_search_history")
      .insert({
        user_id: userId,
        search_term: searchTerm,
        filter_json: parseFilter(filterJson),
      })
      .select("search_id, user_id, search_term, filter_json, created_at")
      .single();

    throwOnError(error);
    return data;
  },

  async getSearchHistory(userId, limit = 20, offset = 0) {
    const db = getSupabase();
    const end = offset + limit - 1;
    const { data, error } = await db
      .from("user_search_history")
      .select("search_id, user_id, search_term, filter_json, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, end);

    throwOnError(error);
    return data;
  },

  async clearSearchHistory(userId) {
    const db = getSupabase();
    const { data, error } = await db
      .from("user_search_history")
      .delete()
      .eq("user_id", userId)
      .select("search_id");

    throwOnError(error);
    return data.length;
  },
};
