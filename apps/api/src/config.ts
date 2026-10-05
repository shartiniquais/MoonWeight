import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
const required = (source: NodeJS.ProcessEnv, name: string, min = 1) => {
  const value = source[name];
  if (!value || value.length < min || /replace-with|change-me|your-.*password/i.test(value)) {
    throw new Error(
      `${name} must be configured in .env (${min}+ characters; example values are not accepted)`,
    );
  }
  return value;
};
export const parseEnvironment = (source: NodeJS.ProcessEnv) => {
  const port = Number(source.PORT ?? source.API_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("API_PORT must be between 1 and 65535");
  const origins = (
    source.CORS_ORIGIN ??
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080"
  )
    .split(",")
    .map((s) => s.trim());
  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error("CORS_ORIGIN must contain comma-separated HTTP(S) origins");
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.origin !== origin ||
      url.username ||
      url.password
    ) {
      throw new Error("CORS_ORIGIN must contain exact HTTP(S) origins, without paths or wildcards");
    }
  }
  const production = source.NODE_ENV === "production";
  if (source.COOKIE_SECURE && !["true", "false"].includes(source.COOKIE_SECURE))
    throw new Error("COOKIE_SECURE must be true or false");
  const cookieSecure = source.COOKIE_SECURE ? source.COOKIE_SECURE === "true" : production;
  if (
    production &&
    !cookieSecure &&
    origins.some(
      (origin) => !["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname),
    )
  ) {
    throw new Error("Public production deployments require COOKIE_SECURE=true and HTTPS");
  }
  let databaseUrl = source.DATABASE_URL;
  if (!databaseUrl) {
    const user = encodeURIComponent(source.POSTGRES_USER ?? "moonweight");
    const password = encodeURIComponent(required(source, "POSTGRES_PASSWORD", 16));
    databaseUrl = `postgres://${user}:${password}@${source.POSTGRES_HOST ?? "localhost"}:${source.POSTGRES_PORT ?? "5432"}/${encodeURIComponent(source.POSTGRES_DB ?? "moonweight")}`;
  }
  try {
    const url = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL");
  }
  return {
    port,
    databaseUrl,
    corsOrigins: origins,
    adminPassword: required(source, "ADMIN_PASSWORD", 12),
    sessionSecret: required(source, "SESSION_SECRET", 32),
    cookieSecure,
    isProduction: production,
  };
};
export const env = parseEnvironment(process.env);
