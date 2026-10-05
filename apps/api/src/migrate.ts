import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { env } from "./config.js";

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
export const migrate = async (databaseUrl = env.databaseUrl) => {
  const client = postgres(databaseUrl, { max: 1, connect_timeout: 5, onnotice: () => {} });
  try {
    await client.begin(async (tx) => {
      // Serialize startup migrations across API processes.
      await tx`SELECT pg_advisory_xact_lock(76492010)`;
      await tx`CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), checksum TEXT)`;
      await tx`ALTER TABLE app_migrations ADD COLUMN IF NOT EXISTS checksum TEXT`;
      const files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
      for (const file of files) {
        const sql = readFileSync(resolve(migrationsDir, file), "utf8");
        const checksum = createHash("sha256")
          .update(sql.replace(/\r\n/g, "\n").replace(/^\uFEFF/, ""))
          .digest("hex");
        const [existing] = await tx`SELECT checksum FROM app_migrations WHERE name = ${file}`;
        if (existing) {
          if (existing.checksum && existing.checksum !== checksum)
            throw new Error(
              `Applied migration ${file} was modified. Restore the file and add a new migration instead.`,
            );
          if (!existing.checksum)
            await tx`UPDATE app_migrations SET checksum = ${checksum} WHERE name = ${file}`;
          continue;
        }
        await tx.unsafe(sql.replace(/^\uFEFF/, ""));
        await tx`INSERT INTO app_migrations (name, checksum) VALUES (${file}, ${checksum})`;
        console.log(`Applied migration ${file}`);
      }
    });
  } finally {
    await client.end();
  }
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrate().catch(() => {
    console.error(
      "Migration failed. Check database connectivity, existing data constraints, and migration history.",
    );
    process.exitCode = 1;
  });
}
