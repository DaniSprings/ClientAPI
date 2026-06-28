import { isProduction } from "../config/env.js";

export const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const payload = {
    message: error.message || "Internal server error.",
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (!isProduction && statusCode >= 500) {
    payload.stack = error.stack;
  }

  res.status(statusCode).json(payload);
};
