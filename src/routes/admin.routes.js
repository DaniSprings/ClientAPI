/**
 * admin.routes.js
 *
 * Protected admin endpoints — all routes require:
 *   1. A valid JWT (authenticate middleware)
 *   2. The user's role to be "admin" (authorizeAdmin middleware)
 *
 * Mount in server.js:
 *   import { adminRouter } from "./routes/admin.routes.js";
 *   app.use("/api/admin", adminRouter);
 */

import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { userRepository } from "../repositories/user.repository.js";
import { getSupabase } from "../config/database.js";

const adminRouter = Router();

// ─── Admin guard middleware ──────────────────────────────────────────────────
// Checks that the authenticated user's JWT app_metadata contains role:"admin".
// To grant admin in Supabase run:
//   await supabaseAdmin.auth.admin.updateUserById(userId, {
//     app_metadata: { role: "admin" }
//   });

const authorizeAdmin = asyncHandler(async (req, _res, next) => {
  if (!req.user) throw new HttpError(401, "Authentication required.");

  const db = getSupabase();
  const { data: { user }, error } = await db.auth.admin.getUserById(req.user.id);
  if (error || !user) throw new HttpError(401, "Authentication required.");

  if (user.app_metadata?.role !== "admin") {
    throw new HttpError(403, "Admin access required.");
  }

  next();
});

// All admin routes require auth + admin role
adminRouter.use(authenticate, authorizeAdmin);

// ─── Validation ──────────────────────────────────────────────────────────────

const searchQuerySchema = z.object({
  limit:      z.coerce.number().min(1).max(200).default(50),
  offset:     z.coerce.number().min(0).default(0),
  userId:     z.string().uuid().optional(),
  searchTerm: z.string().trim().max(200).optional(),
});

const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

// ─── Search history (all users) ─────────────────────────────────────────────

// GET /api/admin/searches?limit=50&offset=0&userId=...&searchTerm=...
// Returns paginated search history across ALL users for the admin dashboard.
adminRouter.get(
  "/searches",
  asyncHandler(async (req, res) => {
    const { limit, offset, userId, searchTerm } = searchQuerySchema.parse(req.query);

    const { rows, total } = await userRepository.getAllSearchHistory({
      limit,
      offset,
      userId:     userId     || null,
      searchTerm: searchTerm || null,
    });

    res.json({
      total,
      limit,
      offset,
      searches: rows.map((row) => ({
        searchId:   row.search_id,
        userId:     row.user_id,
        searchTerm: row.search_term,
        filter:     row.filter_json ?? null,
        ipAddress:  row.ip_address  ?? null,
        createdAt:  row.created_at,
      })),
    });
  }),
);

// DELETE /api/admin/searches/:userId — wipe all searches for a specific user
adminRouter.delete(
  "/searches/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    const deletedCount = await userRepository.clearSearchHistory(userId);
    res.json({ userId, deletedCount });
  }),
);

// ─── User management ─────────────────────────────────────────────────────────

// GET /api/admin/users?limit=50&offset=0
// Lists all registered users via Supabase Admin API.
adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const limit  = Math.min(Number(req.query.limit  || 50),  500);
    const offset = Math.max(Number(req.query.offset || 0),   0);

    const db = getSupabase();
    const { data: { users }, error } = await db.auth.admin.listUsers({
      page:    Math.floor(offset / limit) + 1,
      perPage: limit,
    });

    if (error) throw new HttpError(500, error.message);

    res.json({
      users: users.map((u) => ({
        userId:       u.id,
        email:        u.email,
        name:         u.user_metadata?.name     || "",
        surname:      u.user_metadata?.surname  || "",
        occupation:   u.user_metadata?.occupation || "",
        role:         u.app_metadata?.role      || "user",
        provider:     u.app_metadata?.provider  || "email",
        createdAt:    u.created_at,
        lastSignInAt: u.last_sign_in_at,
      })),
    });
  }),
);

// PATCH /api/admin/users/:userId/role — promote/demote a user
adminRouter.patch(
  "/users/:userId/role",
  asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    const role = z.enum(["user", "admin"]).parse(req.body.role);

    const db = getSupabase();
    const { error } = await db.auth.admin.updateUserById(userId, {
      app_metadata: { role },
    });

    if (error) throw new HttpError(500, error.message);
    res.json({ userId, role, message: `User role updated to "${role}".` });
  }),
);

// DELETE /api/admin/users/:userId — hard-delete a user
adminRouter.delete(
  "/users/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    const db = getSupabase();
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) throw new HttpError(500, error.message);
    res.json({ userId, message: "User deleted." });
  }),
);

export { adminRouter };
