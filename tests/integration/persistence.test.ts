import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { env } from "../../apps/api/src/config.js";
import { app } from "../../apps/api/src/app.js";
import { db, postgresClient } from "../../apps/api/src/db/client.js";
import { sessions } from "../../apps/api/src/db/schema.js";
import { migrate } from "../../apps/api/src/migrate.js";
import { createSessionToken, verifySessionToken } from "../../apps/api/src/auth/session.js";
import type { WeightEntry } from "@moonweight/shared";

if (
  new URL(env.databaseUrl).pathname.slice(1) !== process.env.MOONWEIGHT_TEST_DATABASE ||
  !/^moonweight_test_[a-f0-9]{32}$/.test(process.env.MOONWEIGHT_TEST_DATABASE ?? "")
) {
  throw new Error(
    "Run integration tests through npm run test:integration. Refusing to modify an existing database.",
  );
}
const legacyId = randomUUID();
const send = (path: string, method = "GET", body?: unknown, cookie?: string) =>
  app.request(path, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
const login = async () => {
  const response = await send("/api/auth/login", "POST", { password: env.adminPassword });
  expect(response.status).toBe(200);
  return response.headers.get("Set-Cookie")!.split(";")[0];
};
beforeAll(async () => {
  // Simulate the exact pre-v1 migration table and timestamp data.
  await postgresClient.unsafe(
    readFileSync("apps/api/migrations/0001_create_weight_entries.sql", "utf8"),
  );
  await postgresClient`CREATE TABLE app_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await postgresClient`INSERT INTO app_migrations (name) VALUES ('0001_create_weight_entries.sql')`;
  await postgresClient`INSERT INTO weight_entries (id, weight_kg, date, note) VALUES (${legacyId}, 81.25, '2025-03-30T12:00:00Z', 'Fictional legacy fixture')`;
  await migrate();
});
afterAll(async () => {
  await postgresClient.end();
});
describe("real PostgreSQL persistence", () => {
  it("upgrades legacy data without loss and serializes repeated migrations", async () => {
    await Promise.all([migrate(), migrate()]);
    const [row] =
      await postgresClient`SELECT weight_kg, date::text, recorded_at_legacy::text, note FROM weight_entries WHERE id = ${legacyId}`;
    expect(row).toMatchObject({
      weight_kg: "81.250",
      date: "2025-03-30",
      note: "Fictional legacy fixture",
    });
    expect(row.recorded_at_legacy).toContain("12:00:00");
    const migrations =
      await postgresClient`SELECT name, checksum FROM app_migrations ORDER BY name`;
    expect(migrations).toHaveLength(2);
    expect(
      migrations.every((row) => typeof row.checksum === "string" && row.checksum.length === 64),
    ).toBe(true);
  });
  it("protects routes and persists a hashed, random, revocable session", async () => {
    expect((await send("/api/weights")).status).toBe(401);
    expect((await send("/api/auth/login", "POST", { password: "wrong" })).status).toBe(401);
    const cookie = await login();
    const token = cookie.split("=")[1];
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const independent = postgres(env.databaseUrl, { max: 1 });
    const stored = await independent`SELECT token_hash FROM sessions`;
    await independent.end();
    expect(stored).toHaveLength(1);
    expect(stored[0].token_hash).not.toBe(token);
    expect(stored[0].token_hash).toHaveLength(64);
    expect((await send("/api/weights", "GET", undefined, cookie)).status).toBe(200);
    expect((await send("/api/auth/logout", "POST", undefined, cookie)).status).toBe(200);
    expect((await send("/api/weights", "GET", undefined, cookie)).status).toBe(401);
  });
  it("rejects tampered, expired, malformed and rotated-secret sessions", async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
    expect(await verifySessionToken(token + ".extra")).toBe(false);
    expect(await verifySessionToken("invalid")).toBe(false);
    expect(await verifySessionToken(token.slice(0, -1) + (token.endsWith("a") ? "b" : "a"))).toBe(
      false,
    );
    const previous = env.sessionSecret;
    env.sessionSecret = "fictional-rotated-secret-with-32-characters";
    expect(await verifySessionToken(token)).toBe(false);
    env.sessionSecret = previous;
    await db.update(sessions).set({ expiresAt: new Date("2000-01-01") });
    expect(await verifySessionToken(token)).toBe(false);
  });
  it("creates and updates calendar dates/notes, orders same-day readings and deletes", async () => {
    const cookie = await login();
    const input = { date: "2025-04-01", weightKg: 80.123, note: "Fictional morning" };
    const response = await send("/api/weights", "POST", input, cookie);
    expect(response.status).toBe(201);
    const entry = (await response.json()) as WeightEntry;
    expect(entry).toMatchObject(input);
    const sameDay = await send("/api/weights", "POST", { ...input, weightKg: 80.2 }, cookie);
    expect(sameDay.status).toBe(201);
    expect(
      ((await (await send("/api/weights", "GET", undefined, cookie)).json()) as WeightEntry[])[0]
        .weightKg,
    ).toBe(80.2);
    const updated = await send(
      `/api/weights/${entry.id}`,
      "PATCH",
      { date: "2025-04-02", note: "" },
      cookie,
    );
    expect(await updated.json()).toMatchObject({ date: "2025-04-02", weightKg: 80.123 });
    const [stored] =
      await postgresClient`SELECT note, date::text FROM weight_entries WHERE id = ${entry.id}`;
    expect(stored).toEqual({ note: null, date: "2025-04-02" });
    expect((await send(`/api/weights/${entry.id}`, "DELETE", undefined, cookie)).status).toBe(204);
    expect((await send(`/api/weights/${entry.id}`, "DELETE", undefined, cookie)).status).toBe(404);
  });
  it("rejects API and direct-database invalid values", async () => {
    const cookie = await login();
    for (const input of [
      { date: "2025-02-30", weightKg: 80 },
      { date: "2025-01-01", weightKg: 0 },
      { date: "2025-01-01", weightKg: "80" },
    ]) {
      expect((await send("/api/weights", "POST", input, cookie)).status).toBe(400);
    }
    await expect(
      postgresClient`INSERT INTO weight_entries (id, weight_kg, date) VALUES (${randomUUID()}, -1, '2025-01-01')`,
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("persists unit and target settings across independent connections", async () => {
    const cookie = await login();
    expect(
      (await send("/api/settings", "PUT", { unit: "lb", targetWeightKg: 76.123 }, cookie)).status,
    ).toBe(200);
    const independent = postgres(env.databaseUrl, { max: 1 });
    const [stored] = await independent`SELECT unit, target_weight_kg FROM app_settings`;
    await independent.end();
    expect(stored).toEqual({ unit: "lb", target_weight_kg: "76.123" });
    expect(
      (await send("/api/settings", "PUT", { unit: "kg", targetWeightKg: null }, cookie)).status,
    ).toBe(200);
  });
  it("imports atomically, skips duplicates under concurrent imports, and never overwrites", async () => {
    const cookie = await login();
    const inputs = [
      { date: "2025-01-01", weightKg: 83.25, note: "Fictional import" },
      { date: "2025-01-02", weightKg: 83.1 },
    ];
    const responses = await Promise.all([
      send("/api/weights/import", "POST", { entries: inputs }, cookie),
      send("/api/weights/import", "POST", { entries: inputs }, cookie),
    ]);
    const results = (await Promise.all(responses.map((response) => response.json()))) as {
      imported: number;
      skipped: number;
    }[];
    expect(results.reduce((sum, result) => sum + result.imported, 0)).toBe(2);
    expect(results.reduce((sum, result) => sum + result.skipped, 0)).toBe(2);
    const duplicate = await send("/api/weights/import", "POST", { entries: inputs }, cookie);
    expect(await duplicate.json()).toEqual({ imported: 0, skipped: 2 });
    const before = await postgresClient`SELECT COUNT(*)::int AS count FROM weight_entries`;
    expect(
      (
        await send(
          "/api/weights/import",
          "POST",
          { entries: [...inputs, { date: "2025-01-03", weightKg: -1 }] },
          cookie,
        )
      ).status,
    ).toBe(400);
    expect(await postgresClient`SELECT COUNT(*)::int AS count FROM weight_entries`).toEqual(before);
    const csv = await send("/api/weights/export", "GET", undefined, cookie);
    expect(await csv.text()).toContain("2025-01-01,83.250,Fictional import");
  });
  it("returns a useful readiness status", async () => {
    expect(await (await send("/health")).json()).toEqual({ status: "ok" });
  });
});
