import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { env } from "./config.js";
import { postgresClient } from "./db/client.js";
import { migrate } from "./migrate.js";

try {
  await migrate();
  const server = serve(
    { fetch: app.fetch, port: env.port, hostname: env.isProduction ? "0.0.0.0" : "127.0.0.1" },
    (info) => console.log(`MoonWeight API listening on http://localhost:${info.port}`),
  );
  const shutdown = () => {
    server.close(() => {
      void postgresClient.end().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
} catch {
  console.error(
    "MoonWeight could not start. Check PostgreSQL connectivity, .env configuration, and migration constraints.",
  );
  process.exitCode = 1;
}
