import { Router } from "express";
import { authService } from "../services/auth.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = Router();

const renderPopup = (payload) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Authentication complete</title>
  </head>
  <body>
    <script>
      localStorage.setItem("authToken", ${JSON.stringify(payload.token)});
      localStorage.setItem("userId", ${JSON.stringify(String(payload.userId))});
      localStorage.setItem("username", ${JSON.stringify(payload.username)});
      window.close();
    </script>
    <p>Authentication complete. You can close this window.</p>
  </body>
</html>`;

router.get(
  "/:provider",
  asyncHandler(async (req, res) => {
    const provider = String(req.params.provider || "").toLowerCase();

    if (!["google", "facebook"].includes(provider)) {
      throw new HttpError(400, "Unsupported social provider.");
    }

    const payload = await authService.createDevSocialLogin(provider);
    res.type("html").send(renderPopup(payload));
  }),
);

export default router;
