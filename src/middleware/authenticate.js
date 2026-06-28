import { getAnonSupabase } from "../config/database.js";
import { HttpError } from "../utils/http-error.js";

/**
 * authenticate — hard guard.
 * Rejects the request with 401 if no valid token is present.
 * Use on routes that require login (profile, search history, admin, etc.)
 */
export const authenticate = (req, res, next) => {
  const header = req.get("Authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : req.cookies?.auth_token;

  if (!token) {
    next(new HttpError(401, "Authentication required."));
    return;
  }

  const db = getAnonSupabase();
  db.auth
    .getUser(token)
    .then(({ data: { user }, error }) => {
      if (error || !user) {
        next(new HttpError(401, "Invalid or expired authentication token."));
        return;
      }
      req.user = user;
      next();
    })
    .catch(() => {
      next(new HttpError(401, "Invalid or expired authentication token."));
    });
};

/**
 * authenticateOptional — soft guard.
 * Populates req.user if a valid token is present, but NEVER rejects the request.
 * Use on routes that work for both guests and logged-in users (e.g. /api/search/vehicles).
 * Downstream code checks `if (req.user)` to decide the tier.
 */
export const authenticateOptional = (req, res, next) => {
  const header = req.get("Authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : req.cookies?.auth_token;

  if (!token) {
    req.user = null;
    next();
    return;
  }

  const db = getAnonSupabase();
  db.auth
    .getUser(token)
    .then(({ data: { user }, error }) => {
      req.user = error || !user ? null : user;
      next();
    })
    .catch(() => {
      req.user = null;
      next();
    });
};

/**
 * authorizeUserParam — ownership guard.
 * Confirms the authenticated user owns the resource in the URL param.
 * Always chain AFTER authenticate (hard), never after authenticateOptional.
 */
export const authorizeUserParam =
  (paramName = "userId") =>
  (req, res, next) => {
    if (req.params[paramName] !== req.user?.id) {
      next(new HttpError(403, "You do not have access to this resource."));
      return;
    }
    next();
  };
