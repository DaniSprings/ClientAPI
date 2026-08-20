import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

const PORT = env.port || 8080;

app.listen(PORT, () => {
  console.log(`RevReview Node API listening on ${PORT}`);
});

