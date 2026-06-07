import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../config.js";
import * as schema from "./schema.js";

export const postgresClient = postgres(env.databaseUrl, {
  max: 10,
});

export const db = drizzle(postgresClient, {
  schema,
});
