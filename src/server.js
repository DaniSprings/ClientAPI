import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

const PORT = env.port || clientapi-production-afc7.up.railway.app;

app.listen(PORT, () => {
  console.log(`RevReview Node API listening on http://localhost:${PORT}`);
});

