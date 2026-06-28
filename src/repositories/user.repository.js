import { getSupabase } from "../config/database.js";
import { HttpError } from "../utils/http-error.js";

const throwOnError = (error) => {
  if (error) {
    throw new HttpError(503, error.message);
  }
};

const mapMetadataProfile = (user) => {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  return {
    userId: user.id,
    name: metadata.name || "",
    surname: metadata.surname || "",
    dateOfBirth: metadata.dateOfBirth || metadata.date_of_birth || null,
    occupation: metadata.occupation || "",
    createdAt: user.created_at || null,
    updatedAt: user.updated_at || null,
  };
};

const parseFilter = (filterJson) => {
  if (!filterJson) return null;
  if (typeof filterJson === "string") return JSON.parse(filterJson);
  return filterJson;
};

export const userRepository = {
  // ─── Profile ────────────────────────────────────────────────────────────────

  async createProfile({ userId, name, surname, dateOfBirth, occupation }) {
    const db = getSupabase();
    const { error } = await db.auth.admin.updateUserById(userId, {
      user_metadata: {
        name,
        surname,
        dateOfBirth: dateOfBirth || null,
        occupation: occupation || null,
      },
    });
    throwOnError(error);

    const { data: { user }, error: getError } = await db.auth.admin.getUserById(userId);
    throwOnError(getError);
    return mapMetadataProfile(user);
  },

  async getProfile(userId) {
    const db = getSupabase();
    const { data: { user }, error } = await db.auth.admin.getUserById(userId);
    throwOnError(error);
    return mapMetadataProfile(user);
  },

  async updateProfile(userId, updates) {
    const db = getSupabase();
    const { data: { user: currentUser }, error: getError } = await db.auth.admin.getUserById(userId);
    throwOnError(getError);

    const currentMetadata = currentUser?.user_metadata || {};
    const nextMetadata = {
      ...currentMetadata,
      ...(updates.name !== undefined      ? { name: updates.name }           : {}),
      ...(updates.surname !== undefined   ? { surname: updates.surname }     : {}),
      ...(updates.occupation !== undefined? { occupation: updates.occupation}: {}),
      ...(updates.dateOfBirth !== undefined?{ dateOfBirth: updates.dateOfBirth}:{}),
    };

    const { error } = await db.auth.admin.updateUserById(userId, {
      user_metadata: nextMetadata,
    });
    throwOnError(error);

    const { data: { user }, error: refreshError } = await db.auth.admin.getUserById(userId);
    throwOnError(refreshError);
    return mapMetadataProfile(user);
  },

  // ─── Search History (now fully wired to Supabase) ───────────────────────────
  //
  // Required table — run this SQL once in your Supabase dashboard:
  //
  //   CREATE TABLE search_history (
  //     search_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  //     user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  //     search_term text NOT NULL,
  //     filter_json jsonb,
  //     ip_address  text,              -- optional: captured from req.ip in the route
  //     created_at  timestamptz NOT NULL DEFAULT now()
  //   );
  //
  //   CREATE INDEX ON search_history (user_id, created_at DESC);
  //
  //   -- RLS: only the owning user (or service role) can read their own rows
  //   ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
  //   CREATE POLICY "users_own_searches" ON search_history
  //     FOR ALL USING (auth.uid() = user_id);

  async addSearchHistory(userId, searchTerm, filterJson, ipAddress = null) {
    const db = getSupabase(); // service-role client — bypasses RLS

    const { data, error } = await db
      .from("search_history")
      .insert({
        user_id:     userId,
        search_term: searchTerm,
        filter_json: parseFilter(filterJson),
        ip_address:  ipAddress,
      })
      .select("search_id, user_id, search_term, filter_json, created_at")
      .single();

    throwOnError(error);
    return data;
  },

  async getSearchHistory(userId, limit = 20, offset = 0) {
    const db = getSupabase();

    const { data, error } = await db
      .from("search_history")
      .select("search_id, user_id, search_term, filter_json, ip_address, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    throwOnError(error);
    return data ?? [];
  },

  async clearSearchHistory(userId) {
    const db = getSupabase();

    // count first so we can return how many rows were removed
    const { count, error: countError } = await db
      .from("search_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    throwOnError(countError);

    const { error } = await db
      .from("search_history")
      .delete()
      .eq("user_id", userId);

    throwOnError(error);
    return count ?? 0;
  },

  // ─── Admin helpers ───────────────────────────────────────────────────────────
  // Used by adminRoutes (see companion file) — service-role only.

  async getAllSearchHistory({ limit = 50, offset = 0, userId = null, searchTerm = null } = {}) {
    const db = getSupabase();

    let query = db
      .from("search_history")
      .select(
        "search_id, user_id, search_term, filter_json, ip_address, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId)     query = query.eq("user_id", userId);
    if (searchTerm) query = query.ilike("search_term", `%${searchTerm}%`);

    const { data, count, error } = await query;
    throwOnError(error);
    return { rows: data ?? [], total: count ?? 0 };
  },
};
