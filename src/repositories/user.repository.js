import { supabase } from "../config/supabase.js";

const mapUserRecord = (row) => ({
  userId: row.userid,
  name: row.name,
  surname: row.surname,
  dateOfBirth: row.dateofbirth,
  occupation: row.occupation,
  email: row.email,
  passwordHash: row.passwordhash,
  authProvider: row.authprovider,
  externalAuthId: row.externalauthid,
  createdAt: row.createdat,
  updatedAt: row.updatedat,
});

export const userRepository = {
  async findByEmail(email) {
    const { data, error } = await supabase
      .from("useraccount")
      .select("*")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapUserRecord(data) : null;
  },

  async findByProvider(provider, externalAuthId) {
    const { data, error } = await supabase
      .from("useraccount")
      .select("*")
      .eq("authprovider", provider)
      .eq("externalauthid", externalAuthId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapUserRecord(data) : null;
  },

  async findById(userId) {
    const { data, error } = await supabase
      .from("useraccount")
      .select("*")
      .eq("userid", userId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapUserRecord(data) : null;
  },

  async createLocalUser({ name, surname, dateOfBirth, occupation, email, passwordHash }) {
    const { data, error } = await supabase
      .from("useraccount")
      .insert({
        name,
        surname,
        dateofbirth: dateOfBirth ?? null,
        occupation: occupation ?? null,
        email,
        passwordhash: passwordHash,
        authprovider: "local",
      })
      .select()
      .single();

    if (error) throw error;
    return mapUserRecord(data);
  },

  async createSocialUser({ name, surname, email, provider, externalAuthId }) {
    const { data, error } = await supabase
      .from("useraccount")
      .insert({
        name,
        surname,
        email,
        authprovider: provider,
        externalauthid: externalAuthId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapUserRecord(data);
  },

  async linkSocialProvider(userId, provider, externalAuthId) {
    const { error } = await supabase
      .from("useraccount")
      .update({
        authprovider: provider,
        externalauthid: externalAuthId,
        updatedat: new Date().toISOString(),
      })
      .eq("userid", userId);

    if (error) throw error;
  },

  async updateUserProfile(userId, updates) {
    // Build the patch object with only provided fields
    const patch = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.surname !== undefined) patch.surname = updates.surname;
    if (updates.occupation !== undefined) patch.occupation = updates.occupation;
    if (updates.email !== undefined) patch.email = updates.email;
    patch.updatedat = new Date().toISOString();

    const { data, error } = await supabase
      .from("useraccount")
      .update(patch)
      .eq("userid", userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data ? mapUserRecord(data) : null;
  },

  async updatePassword(userId, passwordHash) {
    const { error } = await supabase
      .from("useraccount")
      .update({
        passwordhash: passwordHash,
        updatedat: new Date().toISOString(),
      })
      .eq("userid", userId);

    if (error) throw error;
  },

  async addSearchHistory(userId, searchTerm, filterJson) {
    const { data, error } = await supabase
      .from("usersearchhistory")
      .insert({
        userid: userId,
        searchterm: searchTerm,
        filterjson: filterJson ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSearchHistory(userId, limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from("usersearchhistory")
      .select("searchid, userid, searchterm, filterjson, createdat")
      .eq("userid", userId)
      .order("createdat", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  },

  async clearSearchHistory(userId) {
    // Supabase doesn't return a row count from delete directly,
    // so we fetch matching IDs first, then delete.
    const { data: rows, error: fetchError } = await supabase
      .from("usersearchhistory")
      .select("searchid")
      .eq("userid", userId);

    if (fetchError) throw fetchError;

    if (!rows || rows.length === 0) return 0;

    const { error: deleteError } = await supabase
      .from("usersearchhistory")
      .delete()
      .eq("userid", userId);

    if (deleteError) throw deleteError;

    return rows.length;
  },
};