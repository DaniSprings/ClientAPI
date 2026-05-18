import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { cors } from "cors";

const app = createApp();
app.use(cors({
  origin: [
    "https://client-deployment-xi.vercel.app",
    "https://www.revreview.co.za"
  ],
  credentials: true
}));

app.listen(env.port, () => {
  console.log(`RevReview Node API listening on http://localhost:${env.port}`);
});
