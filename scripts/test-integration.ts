import { randomUUID, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import postgres from "postgres";
import { env } from "../apps/api/src/config.js";

const database = `moonweight_test_${randomUUID().replaceAll("-", "")}`;
const target = new URL(env.databaseUrl);
target.pathname = `/${database}`;
const admin = postgres(env.databaseUrl, { max: 1, connect_timeout: 5, onnotice: () => {} });
let created = false;
try {
  await admin.unsafe(`CREATE DATABASE "${database}"`);
  created = true;
  const exitCode = await new Promise<number>((resolve) => {
    const child = spawn(
      process.execPath,
      ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.integration.config.ts"],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: target.toString(),
          MOONWEIGHT_TEST_DATABASE: database,
          NODE_ENV: "test",
          COOKIE_SECURE: "false",
          ADMIN_PASSWORD: "fictional-integration-password",
          SESSION_SECRET: randomBytes(32).toString("hex"),
        },
      },
    );
    child.on("error", () => resolve(1));
    child.on("exit", (code) => resolve(code ?? 1));
  });
  process.exitCode = exitCode;
} catch {
  console.error(
    "Integration tests need a reachable PostgreSQL server and a database user with CREATE DATABASE permission. Configure .env first.",
  );
  process.exitCode = 1;
} finally {
  // This runner can only remove the unique database it created in this process.
  if (created && /^moonweight_test_[a-f0-9]{32}$/.test(database)) {
    await admin.unsafe(`DROP DATABASE "${database}" WITH (FORCE)`);
  }
  await admin.end();
}
