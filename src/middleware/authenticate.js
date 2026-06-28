import { getAnonSupabase } from "../config/database.js";
import { HttpError } from "../utils/http-error.js";

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
      req.user = user; // Supabase user: { id (UUID), email, ... }
      next();
    })
    .catch(() => {
      next(new HttpError(401, "Invalid or expired authentication token."));
    });
};

export const authorizeUserParam =
  (paramName = "userId") =>
  (req, res, next) => {
    if (req.params[paramName] !== req.user.id) {
      next(new HttpError(403, "You do not have access to this resource."));
      return;
    }

    next();
  };
