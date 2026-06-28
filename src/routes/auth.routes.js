import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { authenticate, authorizeUserParam } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { isProduction } from "../config/env.js";
import { authService } from "../services/auth.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const authRouter = Router();
const legacyAuthRouter = Router();

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});

const signUpSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    surname: z.string().trim().min(1).max(100),
    dateOfBirth: z.string().trim().min(1),
    occupation: z.string().trim().min(1).max(150),
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const socialSchema = z.object({
  provider: z.enum(["google", "facebook"]),
  providerId: z.string().trim().min(1),
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1),
});

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  surname: z.string().trim().min(1).max(100).optional(),
  occupation: z.string().trim().min(1).max(150).optional(),
  email: z.string().trim().email().optional(),
});

const userIdSchema = z.string().uuid();

const changePasswordSchema = z.object({
  userId: userIdSchema,
  oldPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
});

const trackSearchSchema = z.object({
  userId: userIdSchema,
  searchTerm: z.string().trim().min(1).max(200),
  filter: z.any().optional(),
});

const setAuthCookie = (res, token) => {
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 2 * 60 * 60 * 1000,
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
  });
};

const handleSignUp = asyncHandler(async (req, res) => {
  const payload = await authService.signUp({
    ...req.body,
    email: req.body.email.toLowerCase(),
  });
  setAuthCookie(res, payload.token);
  res.status(201).json(payload);
});

authRouter.use(authLimiter);

authRouter.post("/signup", validate(signUpSchema), handleSignUp);
legacyAuthRouter.post("/register", validate(signUpSchema), handleSignUp);

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const payload = await authService.login(
      req.body.email.toLowerCase(),
      req.body.password,
    );
    setAuthCookie(res, payload.token);
    res.json(payload);
  }),
);

authRouter.post(
  "/social-login",
  validate(socialSchema),
  asyncHandler(async (req, res) => {
    const payload = await authService.socialLogin(req.body);
    setAuthCookie(res, payload.token);
    res.json(payload);
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await authService.getCurrentUser(req.user.id));
  }),
);

authRouter.put(
  "/user/:userId",
  authenticate,
  authorizeUserParam(),
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    res.json(await authService.updateProfile(req.params.userId, req.body));
  }),
);

authRouter.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    if (req.body.userId !== req.user.id) {
      throw new HttpError(403, "You can only change your own password.");
    }

    await authService.changePassword(
      req.body.userId,
      req.body.oldPassword,
      req.body.newPassword,
    );

    res.json({ message: "Password updated successfully." });
  }),
);

authRouter.post(
  "/search",
  authenticate,
  validate(trackSearchSchema),
  asyncHandler(async (req, res) => {
    if (req.body.userId !== req.user.id) {
      throw new HttpError(403, "You can only track searches for your own account.");
    }

    const entry = await authService.trackSearch(
      req.body.userId,
      req.body.searchTerm,
      req.body.filter,
    );

    res.status(201).json({
      searchId: entry.search_id,
      message: entry.skipped ? "Search history is disabled for now." : "Search saved.",
      skipped: Boolean(entry.skipped),
    });
  }),
);

authRouter.get(
  "/user/:userId/searches",
  authenticate,
  authorizeUserParam(),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    res.json({
      enabled: false,
      searches: await authService.getUserSearches(req.params.userId, limit, offset),
    });
  }),
);

authRouter.delete(
  "/user/:userId/searches",
  authenticate,
  authorizeUserParam(),
  asyncHandler(async (req, res) => {
    const deletedCount = await authService.clearUserSearches(req.params.userId);
    res.json({ deletedCount, skipped: true });
  }),
);

authRouter.post("/logout", asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully." });
}));

export { authRouter, legacyAuthRouter };