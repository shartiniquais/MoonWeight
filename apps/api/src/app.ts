import type { ApiError } from "@moonweight/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { env } from "./config.js";
import { requireAuth } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { weightsRoutes } from "./routes/weights.js";

export const app = new Hono();

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const hasNestedErrorCode = (value: unknown, code: string): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  if (value.code === code) {
    return true;
  }

  if (hasNestedErrorCode(value.cause, code)) {
    return true;
  }

  if (Array.isArray(value.errors)) {
    return value.errors.some((error) => hasNestedErrorCode(error, code));
  }

  return false;
};

app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: env.corsOrigin === "*" ? "*" : env.corsOrigin.split(",").map((origin) => origin.trim()),
    credentials: true,
  }),
);

app.get("/health", (c) =>
  c.json({
    status: "ok",
  }),
);

app.route("/api", authRoutes);
app.use("/api/weights/*", requireAuth);
app.use("/api/weights", requireAuth);
app.use("/api/stats", requireAuth);
app.route("/api", weightsRoutes);

app.notFound((c) => c.json<ApiError>({ error: "Not found" }, 404));

app.onError((error, c) => {
  if (hasNestedErrorCode(error, "ECONNREFUSED")) {
    console.error("Database connection failed. Check PostgreSQL and DATABASE_URL.");
    return c.json<ApiError>({ error: "Database is unavailable. Check PostgreSQL and DATABASE_URL." }, 503);
  }

  console.error(error);
  return c.json<ApiError>({ error: "Internal server error" }, 500);
});
