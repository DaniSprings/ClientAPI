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

const mapMetadataProfile = (user) => {
  if (!user) {
    return null;
  }

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
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.surname !== undefined ? { surname: updates.surname } : {}),
      ...(updates.occupation !== undefined ? { occupation: updates.occupation } : {}),
      ...(updates.dateOfBirth !== undefined ? { dateOfBirth: updates.dateOfBirth } : {}),
    };

    const { error } = await db.auth.admin.updateUserById(userId, {
      user_metadata: nextMetadata,
    });

    throwOnError(error);

    const { data: { user }, error: refreshError } = await db.auth.admin.getUserById(userId);
    throwOnError(refreshError);
    return mapMetadataProfile(user);
  },

  async addSearchHistory(userId, searchTerm, filterJson) {
    return {
      search_id: null,
      user_id: userId,
      search_term: searchTerm,
      filter_json: parseFilter(filterJson),
      created_at: new Date().toISOString(),
      skipped: true,
    };
  },

  async getSearchHistory(userId, limit = 20, offset = 0) {
    void userId;
    void limit;
    void offset;
    return [];
  },

  async clearSearchHistory(userId) {
    void userId;
    return 0;
  },
};
