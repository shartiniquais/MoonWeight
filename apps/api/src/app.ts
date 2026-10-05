import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { HTTPException } from "hono/http-exception";
import { env } from "./config.js";
import { postgresClient } from "./db/client.js";
import { requireAuth } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { weightsRoutes } from "./routes/weights.js";
import { settingsRoutes } from "./routes/settings.js";

export const app = new Hono();
app.use(secureHeaders({ strictTransportSecurity: env.cookieSecure ? "max-age=31536000" : false }));
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const origin = c.req.header("Origin");
    if (origin && !env.corsOrigins.includes(origin))
      return c.json({ error: "Origin is not allowed" }, 403);
    if (c.req.header("Sec-Fetch-Site") === "cross-site")
      return c.json({ error: "Cross-site requests are not allowed" }, 403);
    // All writes (including logout) require JSON. Cross-origin HTML forms cannot meet this.
    if (
      (c.req.header("Content-Type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json"
    ) {
      return c.json({ error: "Content-Type must be application/json" }, 415);
    }
  }
  await next();
});
app.use(
  "/api/*",
  cors({
    origin: env.corsOrigins,
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowHeaders: ["Content-Type"],
  }),
);
app.use("/api/*", (c, next) => {
  // JSON adds keys and escaping to the CSV preview's 1 MB maximum.
  const megabytes = c.req.path === "/api/weights/import" ? 2 : 1;
  return bodyLimit({
    maxSize: megabytes * 1_048_576,
    onError: (c) => c.json({ error: `Request must be ${megabytes} MB or smaller` }, 413),
  })(c, next);
});
app.get("/health", async (c) => {
  await postgresClient`SELECT 1`;
  return c.json({ status: "ok" });
});
app.route("/api", authRoutes);
app.use("/api/*", requireAuth);
app.route("/api", weightsRoutes);
app.route("/api", settingsRoutes);
app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((error, c) => {
  if (error instanceof HTTPException)
    return c.json(
      {
        error:
          error.status === 413 ? "Request body is too large" : "Request could not be processed",
      },
      error.status,
    );
  console.error("API request failed", { path: c.req.path });
  return c.json({ error: "The service is unavailable. Please try again." }, 503);
});
