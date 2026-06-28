import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

const PORT = env.port || 3000;

app.listen(PORT, () => {
  console.log(`RevReview Node API listening on http://localhost:${PORT}`);
});

