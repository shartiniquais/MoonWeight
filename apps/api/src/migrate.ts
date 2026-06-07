import "dotenv/config";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

import { env } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, "..", "migrations");

const run = async () => {
  const client = postgres(env.databaseUrl, {
    max: 1,
  });

  if (!existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  await client`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const [existing] = await client`
      SELECT name FROM app_migrations WHERE name = ${file}
    `;

    if (existing) {
      continue;
    }

    const sql = readFileSync(resolve(migrationsDir, file), "utf8");

    await client.begin(async (transaction) => {
      await transaction.unsafe(sql);
      await transaction`
        INSERT INTO app_migrations (name) VALUES (${file})
      `;
    });

    console.log(`Applied migration ${file}`);
  }

  await client.end();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
