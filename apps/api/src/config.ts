import "dotenv/config";

const requireEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

const parsePort = () => {
  const rawPort = process.env.PORT ?? process.env.API_PORT ?? "3001";
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return port;
};

export const env = {
  port: parsePort(),
  databaseUrl: requireEnv("DATABASE_URL"),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  adminPassword: requireEnv("ADMIN_PASSWORD"),
  sessionSecret: requireEnv("SESSION_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
};
