/**
 * search.routes.js
 *
 * Public-facing search API for RevReview vehicles.
 *
 * ┌─────────────┬─────────────────────────────────────────────────────────┐
 * │ Tier        │ Behaviour                                               │
 * ├─────────────┼─────────────────────────────────────────────────────────┤
 * │ Guest       │ 10 searches / 24 h (by IP). Returns limited fields.     │
 * │ Logged-in   │ Unlimited. Returns full fields. Search saved to DB.     │
 * └─────────────┴─────────────────────────────────────────────────────────┘
 *
 * Mount in server.js:
 *   import { searchRouter } from "./routes/search.routes.js";
 *   app.use("/api/search", searchRouter);
 */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { authenticateOptional } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { authService } from "../services/auth.service.js";
import { getSupabase } from "../config/database.js";

const searchRouter = Router();

// ─── Guest rate limiter ──────────────────────────────────────────────────────
// Skipped automatically for authenticated users so they never hit the cap.

const guestSearchLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 h
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => Boolean(req.user), // req.user is set by authenticate (non-throwing)
  keyGenerator: (req) => req.ip,    // rate-limit by IP, not by session
  message: {
    message:
      "You have reached the daily search limit. Sign in for unlimited searches.",
    loginUrl: "/login",
  },
});

// ─── Validation ──────────────────────────────────────────────────────────────

const vehicleSearchSchema = z.object({
  q:      z.string().trim().min(1).max(200).optional(), // free-text query
  brand:  z.string().trim().max(100).optional(),
  model:  z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  limit:  z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip sensitive / premium fields for guest responses.
 * Adjust the field list to match what you want to gate.
 */
const toGuestVehicle = (v) => ({
  brandId:   v.brandid,
  modelId:   v.modelid,
  brand:     v.brand_name  || v.brand,
  model:     v.model_name  || v.model,
  year:      v.year,
  // Price shown as a range hint, not the exact figure
  priceRange: v.price
    ? `R ${Math.floor(v.price / 10000) * 10000}–${Math.ceil(v.price / 10000) * 10000}`
    : null,
});

const toFullVehicle = (v) => ({
  brandId:   v.brandid,
  modelId:   v.modelid,
  brand:     v.brand_name  || v.brand,
  model:     v.model_name  || v.model,
  year:      v.year,
  price:     v.price,
  specs:     v.specs       ?? null,
  images:    v.images      ?? [],
  createdAt: v.created_at  ?? null,
});

// ─── Vehicle search query ─────────────────────────────────────────────────────

const runVehicleQuery = async ({ q, brand, model, minPrice, maxPrice, limit, offset }) => {
  const db = getSupabase();

  // Join brandtable + modeltable + pricetable using the legacy naming your
  // schema uses (discovered in earlier RevReview work).
  let query = db
    .from("modeltable")
    .select(
      `modelid,
       model_name,
       year,
       brandtable ( brandid, brand_name ),
       pricetable ( price )`,
      { count: "exact" },
    )
    .range(offset, offset + limit - 1);

  if (brand)    query = query.ilike("brandtable.brand_name", `%${brand}%`);
  if (model)    query = query.ilike("model_name",             `%${model}%`);
  if (q)        query = query.or(
    `model_name.ilike.%${q}%,brandtable.brand_name.ilike.%${q}%`,
  );
  if (minPrice !== undefined)
    query = query.gte("pricetable.price", minPrice);
  if (maxPrice !== undefined)
    query = query.lte("pricetable.price", maxPrice);

  const { data, count, error } = await query;
  if (error) throw error;

  // Flatten the nested join into a flat object for the mappers above
  return {
    rows: (data ?? []).map((row) => ({
      modelid:    row.modelid,
      model_name: row.model_name,
      year:       row.year,
      brandid:    row.brandtable?.brandid,
      brand_name: row.brandtable?.brand_name,
      price:      row.pricetable?.price ?? null,
    })),
    total: count ?? 0,
  };
};

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/search/vehicles?q=BMW&brand=BMW&model=3+Series&minPrice=200000
 *
 * authenticate is called in "optional" mode here — it populates req.user
 * if a valid token is present but does NOT reject the request if there is none.
 * The guestSearchLimiter then handles unauthenticated traffic.
 */
searchRouter.get(
  "/vehicles",
  authenticateOptional,  // sets req.user when token valid, never rejects guests
  guestSearchLimiter,    // blocks guests who exceeded daily cap
  asyncHandler(async (req, res) => {
    const params = vehicleSearchSchema.parse(req.query);
    const { rows, total } = await runVehicleQuery(params);

    const isGuest = !req.user;

    // ── Track the search for authenticated users ──
    if (!isGuest) {
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;
      // Fire-and-forget — don't block the response if tracking fails
      authService
        .trackSearch(
          req.user.id,
          params.q || [params.brand, params.model].filter(Boolean).join(" ") || "browse",
          { brand: params.brand, model: params.model, minPrice: params.minPrice, maxPrice: params.maxPrice },
          ipAddress,
        )
        .catch((err) => console.error("[search] trackSearch error:", err));
    }

    res.json({
      total,
      limit:    params.limit,
      offset:   params.offset,
      guest:    isGuest,
      // Guests get limited data; logged-in users get full detail
      vehicles: isGuest
        ? rows.map(toGuestVehicle)
        : rows.map(toFullVehicle),
      ...(isGuest && {
        notice: "Sign in to see exact prices, full specs, and unlimited searches.",
      }),
    });
  }),
);

/**
 * GET /api/search/brands — returns all brands (no auth required, no cap)
 * Useful for populating dropdowns on the frontend.
 */
searchRouter.get(
  "/brands",
  asyncHandler(async (_req, res) => {
    const db = getSupabase();
    const { data, error } = await db
      .from("brandtable")
      .select("brandid, brand_name")
      .order("brand_name");

    if (error) throw error;
    res.json({ brands: data ?? [] });
  }),
);

export { searchRouter };
