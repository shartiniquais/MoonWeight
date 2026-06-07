import { serve } from "@hono/node-server";

import { app } from "./app.js";
import { env } from "./config.js";

serve(
  {
    fetch: app.fetch,
    port: env.port,
  },
  (info) => {
    console.log(`MoonWeight API listening on http://localhost:${info.port}`);
  },
);
