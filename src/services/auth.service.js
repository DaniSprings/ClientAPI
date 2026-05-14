import { env } from "../config/env.js";
import { getSupabase, getAnonSupabase } from "../config/database.js";
import { userRepository } from "../repositories/user.repository.js";
import { HttpError } from "../utils/http-error.js";

const splitName = (fullName) => {
  const [name, ...surnameParts] = String(fullName || "User").trim().split(" ");
  return { name: name || "User", surname: surnameParts.join(" ") || "Account" };
};

const buildPayload = (session, user, profile) => ({
  token: session.access_token,
  userId: user.id,
  username: user.email,
  email: user.email,
  name: profile?.name || "",
  surname: profile?.surname || "",
  occupation: profile?.occupation || "",
});

export const authService = {
  async signUp(payload) {
    const db = getSupabase();

    // Create auth user — email_confirm:true skips the verification email
    const { data: { user }, error } = await db.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
    });

    if (error) {
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("already") || error.code === "23505") {
        throw new HttpError(409, "An account with this email already exists.");
      }
      throw new HttpError(500, error.message);
    }

    await userRepository.createProfile({
      userId: user.id,
      name: payload.name,
      surname: payload.surname,
      dateOfBirth: payload.dateOfBirth,
      occupation: payload.occupation,
    });

    // Sign in to obtain a session token for the response
    const anon = getAnonSupabase();
    const { data: signInData, error: signInError } =
      await anon.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });

    if (signInError || !signInData.session) {
      throw new HttpError(
        500,
        "Account created but login failed. Please log in manually.",
      );
    }

    return buildPayload(signInData.session, signInData.user, {
      name: payload.name,
      surname: payload.surname,
      occupation: payload.occupation,
    });
  },

  async login(email, password) {
    const anon = getAnonSupabase();
    const { data, error } = await anon.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const profile = await userRepository.getProfile(data.user.id);
    return buildPayload(data.session, data.user, profile);
  },

  async socialLogin({ provider, providerId, email, fullName }) {
    const db = getSupabase();
    const anon = getAnonSupabase();
    // Deterministic dev password — not a real credential, dev-only flow
    const tempPassword = `__dev_${provider}_${Buffer.from(providerId).toString("base64").slice(0, 16)}__`;

    // Try signing in first (user may already exist from a previous dev login)
    const { data: existingSession, error: signInErr } =
      await anon.auth.signInWithPassword({ email, password: tempPassword });

    if (!signInErr && existingSession?.session) {
      const profile = await userRepository.getProfile(existingSession.user.id);
      return buildPayload(existingSession.session, existingSession.user, profile);
    }

    // Create user
    const { name, surname } = splitName(fullName);
    const { data: { user }, error: createError } =
      await db.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { provider, provider_id: providerId },
      });

    if (createError) throw new HttpError(500, createError.message);

    await userRepository.createProfile({ userId: user.id, name, surname });

    const { data, error } = await anon.auth.signInWithPassword({
      email,
      password: tempPassword,
    });
    if (error) throw new HttpError(500, "Social login session could not be created.");

    return buildPayload(data.session, data.user, { name, surname, occupation: null });
  },

  async createDevSocialLogin(provider) {
    if (!env.allowDevSocialLogin) {
      throw new HttpError(
        501,
        "Social popup login is disabled. Set ALLOW_DEV_SOCIAL_LOGIN=true for local development.",
      );
    }

    return this.socialLogin({
      provider,
      providerId: `dev-${provider}`,
      email: `${provider}.demo@local.dev`,
      fullName: `${provider} demo`,
    });
  },

  async getCurrentUser(userId) {
    const db = getSupabase();
    const { data: { user }, error } = await db.auth.admin.getUserById(userId);

    if (error || !user) throw new HttpError(404, "User not found.");

    const profile = await userRepository.getProfile(userId);
    return {
      userId: user.id,
      email: user.email,
      username: user.email,
      name: profile?.name || "",
      surname: profile?.surname || "",
      occupation: profile?.occupation || "",
      dateOfBirth: profile?.dateOfBirth || null,
      authProvider: user.app_metadata?.provider || "email",
    };
  },

  async updateProfile(userId, updates) {
    const db = getSupabase();

    if (updates.email) {
      const { error } = await db.auth.admin.updateUserById(userId, {
        email: updates.email,
      });
      if (error) throw new HttpError(500, error.message);
    }

    const updatedProfile = await userRepository.updateProfile(userId, updates);
    if (!updatedProfile) throw new HttpError(404, "User not found.");

    const { data: { user } } = await db.auth.admin.getUserById(userId);
    return {
      userId,
      email: user?.email || updates.email,
      username: user?.email || updates.email,
      name: updatedProfile.name,
      surname: updatedProfile.surname,
      occupation: updatedProfile.occupation,
      dateOfBirth: updatedProfile.dateOfBirth,
    };
  },

  async changePassword(userId, oldPassword, newPassword) {
    const db = getSupabase();
    const anon = getAnonSupabase();

    const { data: { user }, error: getUserError } =
      await db.auth.admin.getUserById(userId);
    if (getUserError || !user) throw new HttpError(404, "User not found.");

    // Verify old password by attempting sign-in
    const { error: verifyError } = await anon.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });
    if (verifyError) throw new HttpError(401, "Current password is incorrect.");

    const { error: updateError } = await db.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateError) throw new HttpError(500, updateError.message);
  },

  async trackSearch(userId, searchTerm, filter) {
    return userRepository.addSearchHistory(
      userId,
      searchTerm,
      filter ? JSON.stringify(filter) : null,
    );
  },

  async getUserSearches(userId, limit, offset) {
    const rows = await userRepository.getSearchHistory(userId, limit, offset);
    return rows.map((row) => ({
      searchId: row.search_id,
      userId: row.user_id,
      searchTerm: row.search_term,
      filter: row.filter_json ? JSON.parse(row.filter_json) : null,
      createdAt: row.created_at,
    }));
  },

  async clearUserSearches(userId) {
    return userRepository.clearSearchHistory(userId);
  },
};
