import { HttpError } from "../utils/http-error.js";

export const validate =
  (schema, property = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[property]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      next(new HttpError(400, "Validation failed.", { errors: details }));
      return;
    }

    if (property === "query") {
      if (req.query && typeof req.query === "object") {
        Object.keys(req.query).forEach((key) => {
          delete req.query[key];
        });

        Object.assign(req.query, result.data);
      }

      req.validatedQuery = result.data;
      next();
      return;
    }

    req[property] = result.data;
    next();
  };
