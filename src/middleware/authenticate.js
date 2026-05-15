import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
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

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch (error) {
    next(new HttpError(401, "Invalid or expired authentication token."));
  }
};

export const authorizeUserParam =
  (paramName = "userId") =>
  (req, res, next) => {
    if (Number(req.params[paramName]) !== Number(req.user.userId)) {
      next(new HttpError(403, "You do not have access to this resource."));
      return;
    }

    next();
  };
