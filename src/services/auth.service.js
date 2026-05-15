import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/user.repository.js";
import { HttpError } from "../utils/http-error.js";

const saltRounds = 12;

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
};

const toAuthPayload = (user) => {
  const token = createToken(user);

  return {
    token,
    userId: user.userId,
    username: user.email,
    email: user.email,
    name: user.name,
    surname: user.surname,
    occupation: user.occupation,
  };
};

const splitName = (fullName) => {
  const [name, ...surnameParts] = String(fullName || "User")
    .trim()
    .split(" ");
  return {
    name: name || "User",
    surname: surnameParts.join(" ") || "Account",
  };
};

export const authService = {
  async signUp(payload) {
    const existingUser = await userRepository.findByEmail(payload.email);

    if (existingUser) {
      throw new HttpError(409, "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(payload.password, saltRounds);
    const user = await userRepository.createLocalUser({
      name: payload.name,
      surname: payload.surname,
      dateOfBirth: payload.dateOfBirth,
      occupation: payload.occupation,
      email: payload.email,
      passwordHash,
    });

    return toAuthPayload(user);
  },

  async login(email, password) {
    const user = await userRepository.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new HttpError(401, "Invalid email or password.");
    }

    return toAuthPayload(user);
  },

  async socialLogin({ provider, providerId, email, fullName }) {
    let user = await userRepository.findByProvider(provider, providerId);

    if (!user && email) {
      user = await userRepository.findByEmail(email);

      if (user) {
        await userRepository.linkSocialProvider(
          user.userId,
          provider,
          providerId,
        );
        user = await userRepository.findById(user.userId);
      }
    }

    if (!user) {
      const nameParts = splitName(fullName);
      user = await userRepository.createSocialUser({
        name: nameParts.name,
        surname: nameParts.surname,
        email,
        provider,
        externalAuthId: providerId,
      });
    }

    return toAuthPayload(user);
  },

  async createDevSocialLogin(provider) {
    if (!env.allowDevSocialLogin) {
      throw new HttpError(
        501,
        "Social popup login is disabled. Configure a real OAuth provider or set ALLOW_DEV_SOCIAL_LOGIN=true for local development.",
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
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new HttpError(404, "User not found.");
    }

    return {
      userId: user.userId,
      email: user.email,
      username: user.email,
      name: user.name,
      surname: user.surname,
      occupation: user.occupation,
      dateOfBirth: user.dateOfBirth,
      authProvider: user.authProvider,
    };
  },

  async updateProfile(userId, updates) {
    const updatedUser = await userRepository.updateUserProfile(userId, updates);

    if (!updatedUser) {
      throw new HttpError(404, "User not found.");
    }

    return {
      userId: updatedUser.userId,
      email: updatedUser.email,
      username: updatedUser.email,
      name: updatedUser.name,
      surname: updatedUser.surname,
      occupation: updatedUser.occupation,
      dateOfBirth: updatedUser.dateOfBirth,
    };
  },

  async changePassword(userId, oldPassword, newPassword) {
    const user = await userRepository.findById(userId);

    if (!user || !user.passwordHash) {
      throw new HttpError(404, "Local account not found for this user.");
    }

    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!isValid) {
      throw new HttpError(401, "Current password is incorrect.");
    }

    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await userRepository.updatePassword(userId, passwordHash);
  },

  async trackSearch(userId, searchTerm, filter) {
    return userRepository.addSearchHistory(
      userId,
      searchTerm,
      filter ? JSON.stringify(filter) : null,
    );
  },

  async getUserSearches(userId, limit, offset) {
    const searches = await userRepository.getSearchHistory(
      userId,
      limit,
      offset,
    );

    return searches.map((entry) => ({
      searchId: entry.SearchId,
      userId: entry.UserId,
      searchTerm: entry.SearchTerm,
      filter: entry.FilterJson ? JSON.parse(entry.FilterJson) : null,
      createdAt: entry.CreatedAt,
    }));
  },

  async clearUserSearches(userId) {
    return userRepository.clearSearchHistory(userId);
  },
};
