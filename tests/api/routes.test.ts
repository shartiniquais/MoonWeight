import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSettings, CreateWeightEntryInput, WeightEntry } from "@moonweight/shared";

const store = vi.hoisted(() => ({
  entries: new Map<string, WeightEntry>(),
  tokens: new Set<string>(),
  settings: { unit: "kg", targetWeightKg: null } as AppSettings,
  id: 0,
  account: null as { id: number; username: string; passwordHash: string; createdAt: Date } | null,
}));
vi.mock("../../apps/api/src/repositories/account.js", async () => {
  const { hashPassword } = await import("../../apps/api/src/auth/password.js");
  return {
    getAccount: async () => store.account,
    createAccount: async (input: { username: string; password: string }) => {
      const passwordHash = await hashPassword(input.password);
      if (store.account) return false;
      store.account = { id: 1, username: input.username, passwordHash, createdAt: new Date() };
      store.tokens.clear();
      return true;
    },
  };
});
vi.mock("../../apps/api/src/db/client.js", () => ({
  postgresClient: vi.fn(async () => []),
  db: {},
}));
vi.mock("../../apps/api/src/auth/session.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../apps/api/src/auth/session.js")>();
  return {
    ...original,
    createSessionToken: async () => {
      const token = String(++store.id).padStart(43, "a");
      store.tokens.add(token);
      return token;
    },
    verifySessionToken: async (token: string) => store.tokens.has(token),
    revokeSession: async (token: string) => {
      store.tokens.delete(token);
    },
  };
});
vi.mock("../../apps/api/src/repositories/weights.js", () => ({
  listWeightEntries: async () => [...store.entries.values()],
  getWeightEntry: async (id: string) => store.entries.get(id) ?? null,
  createWeightEntry: async (input: CreateWeightEntryInput) => {
    const id = `00000000-0000-4000-8000-${String(++store.id).padStart(12, "0")}`;
    const entry = {
      ...input,
      id,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    };
    store.entries.set(id, entry);
    return entry;
  },
  updateWeightEntry: async (id: string, input: Record<string, unknown>) => {
    const old = store.entries.get(id);
    if (!old) return null;
    const entry = { ...old, ...input } as WeightEntry;
    store.entries.set(id, entry);
    return entry;
  },
  deleteWeightEntry: async (id: string) => store.entries.delete(id),
  importWeightEntries: vi.fn(async () => ({ imported: 1, skipped: 0 })),
}));
vi.mock("../../apps/api/src/repositories/settings.js", () => ({
  getSettings: async () => store.settings,
  saveSettings: async (input: AppSettings) => (store.settings = input),
}));
import { app } from "../../apps/api/src/app.js";
import { verifyAdminPassword } from "../../apps/api/src/auth/session.js";
import { env, parseEnvironment } from "../../apps/api/src/config.js";

const send = (path: string, method = "GET", body?: unknown, cookie?: string, extraHeaders = {}) =>
  app.request(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...extraHeaders,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
const login = async () => {
  const response = await send("/api/auth/login", "POST", { password: process.env.ADMIN_PASSWORD });
  expect(response.status).toBe(200);
  return response.headers.get("Set-Cookie")!.split(";")[0];
};
beforeEach(() => {
  store.entries.clear();
  store.tokens.clear();
  store.settings = { unit: "kg", targetWeightKg: null };
  store.account = null;
});
describe("authentication and security boundaries", () => {
  it("sets Secure cookies when configured for HTTPS", async () => {
    const previous = env.cookieSecure;
    env.cookieSecure = true;
    try {
      const response = await send("/api/auth/login", "POST", {
        password: process.env.ADMIN_PASSWORD,
      });
      expect(response.headers.get("Set-Cookie")).toContain("Secure");
    } finally {
      env.cookieSecure = previous;
    }
  });
  it("authenticates a valid password using fixed-length digests", async () => {
    expect(verifyAdminPassword(process.env.ADMIN_PASSWORD!)).toBe(true);
    expect(verifyAdminPassword("short")).toBe(false);
    expect(verifyAdminPassword("x".repeat(1024))).toBe(false);
    const response = await send("/api/auth/login", "POST", {
      password: process.env.ADMIN_PASSWORD,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(response.headers.get("Set-Cookie")).toContain("SameSite=Strict");
    expect(response.headers.get("Set-Cookie")).not.toContain("Secure");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("fails login without disclosing secrets or accepting malformed JSON", async () => {
    expect((await send("/api/auth/login", "POST", { password: "wrong" })).status).toBe(401);
    const malformed = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(malformed.status).toBe(400);
    expect(JSON.stringify(await malformed.json())).not.toContain(process.env.ADMIN_PASSWORD);
  });
  it.each(["/api/weights", "/api/stats", "/api/settings", "/api/weights/export", "/api/unknown"])(
    "protects %s",
    async (path) => {
      expect((await send(path)).status).toBe(401);
    },
  );
  it("retains auth across requests and revokes the token on logout", async () => {
    const cookie = await login();
    expect(await (await send("/api/auth/me", "GET", undefined, cookie)).json()).toEqual({
      authenticated: true,
      setupRequired: true,
    });
    expect((await send("/api/auth/logout", "POST", undefined, cookie)).status).toBe(200);
    expect((await send("/api/weights", "GET", undefined, cookie)).status).toBe(401);
  });
  it("rejects cross-origin writes, HTML forms and oversized bodies", async () => {
    const cookie = await login();
    expect(
      (
        await send("/api/auth/logout", "POST", undefined, cookie, {
          Origin: "https://attacker.example",
        })
      ).status,
    ).toBe(403);
    expect(
      (await send("/api/auth/logout", "POST", undefined, cookie, { "Content-Type": "text/plain" }))
        .status,
    ).toBe(415);
    expect(
      (
        await send("/api/auth/logout", "POST", undefined, cookie, {
          "Sec-Fetch-Site": "cross-site",
        })
      ).status,
    ).toBe(403);
    expect(
      (await send("/api/weights", "POST", { note: "x".repeat(1_048_577) }, cookie)).status,
    ).toBe(413);
  });
  it("allows configured origins only for credentialed CORS", async () => {
    const allowed = await send("/api/auth/me", "GET", undefined, undefined, {
      Origin: "http://localhost:5173",
    });
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
    const rejected = await send("/api/auth/me", "GET", undefined, undefined, {
      Origin: "https://attacker.example",
    });
    expect(rejected.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
describe("private account setup", () => {
  const input = {
    setupKey: "fictional-test-password",
    username: "fixture.owner",
    password: "fictional-account-passphrase",
  };
  it("requires the setup key and validates the new account", async () => {
    expect(
      (await send("/api/auth/setup", "POST", { ...input, setupKey: "incorrect" })).status,
    ).toBe(403);
    expect((await send("/api/auth/setup", "POST", { ...input, password: "short" })).status).toBe(
      400,
    );
    expect((await send("/api/auth/setup", "POST", { ...input, username: "bad name" })).status).toBe(
      400,
    );
    expect(store.account).toBeNull();
    expect((await send("/api/weights")).status).toBe(401);
  });
  it("creates one hashed account, signs in, and disables legacy access", async () => {
    const legacyCookie = await login();
    const setup = await send("/api/auth/setup", "POST", { ...input, username: " Fixture.Owner " });
    expect(setup.status).toBe(201);
    const cookie = setup.headers.get("Set-Cookie")!.split(";")[0];
    expect(await setup.json()).toEqual({ authenticated: true, setupRequired: false });
    expect(store.account?.username).toBe("fixture.owner");
    expect(store.account?.passwordHash).toMatch(/^scrypt\$/);
    expect(store.account?.passwordHash).not.toContain(input.password);
    expect((await send("/api/weights", "GET", undefined, legacyCookie)).status).toBe(401);
    expect((await send("/api/weights", "GET", undefined, cookie)).status).toBe(200);
    expect((await send("/api/auth/setup", "POST", input)).status).toBe(409);
    expect((await send("/api/auth/login", "POST", { password: input.setupKey })).status).toBe(401);
    expect(
      (await send("/api/auth/login", "POST", { username: "unknown", password: input.password }))
        .status,
    ).toBe(401);
    expect(
      (await send("/api/auth/login", "POST", { username: input.username, password: "incorrect" }))
        .status,
    ).toBe(401);
    const signedIn = await send("/api/auth/login", "POST", {
      username: " FIXTURE.OWNER ",
      password: input.password,
    });
    expect(signedIn.status).toBe(200);
    expect(await signedIn.json()).toEqual({ authenticated: true, setupRequired: false });
    const session = signedIn.headers.get("Set-Cookie")!.split(";")[0];
    await send("/api/auth/logout", "POST", undefined, session);
    expect((await send("/api/weights", "GET", undefined, session)).status).toBe(401);
  });
});
describe("weight routes", () => {
  it("creates, updates, clears a note, deletes and calculates stats", async () => {
    const cookie = await login();
    const created = await send(
      "/api/weights",
      "POST",
      { date: "2025-05-01", weightKg: 78.25, note: " morning " },
      cookie,
    );
    expect(created.status).toBe(201);
    const entry = (await created.json()) as WeightEntry;
    expect(entry.note).toBe("morning");
    const updated = await send(
      `/api/weights/${entry.id}`,
      "PATCH",
      { weightKg: 77.75, note: null },
      cookie,
    );
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ weightKg: 77.75, note: null });
    const stats = await send("/api/stats", "GET", undefined, cookie);
    expect(await stats.json()).toMatchObject({
      totalEntries: 1,
      deltaPreviousKg: null,
      latest: { weightKg: 77.75 },
    });
    expect((await send(`/api/weights/${entry.id}`, "DELETE", undefined, cookie)).status).toBe(204);
    expect((await send(`/api/weights/${entry.id}`, "GET", undefined, cookie)).status).toBe(404);
  });
  it.each([
    { date: "2025-02-30", weightKg: 78 },
    { date: "2025-05-01", weightKg: -3 },
    { date: "2025-05-01", weightKg: "78" },
    { date: "2025-05-01", weightKg: 78, note: "x".repeat(501) },
  ])("rejects invalid entries before persistence", async (input) => {
    const cookie = await login();
    expect((await send("/api/weights", "POST", input, cookie)).status).toBe(400);
    expect(store.entries.size).toBe(0);
  });
  it("rejects malformed UUIDs and empty updates", async () => {
    const cookie = await login();
    expect((await send("/api/weights/not-an-id", "GET", undefined, cookie)).status).toBe(400);
    expect(
      (await send("/api/weights/00000000-0000-4000-8000-000000000000", "PATCH", {}, cookie)).status,
    ).toBe(400);
  });
  it("exports canonical CSV and rejects a mixed-invalid import atomically", async () => {
    const cookie = await login();
    const csv = await send("/api/weights/export", "GET", undefined, cookie);
    expect(csv.headers.get("Content-Type")).toContain("text/csv");
    expect(await csv.text()).toBe("date,weight_kg,note\r\n");
    expect(
      (
        await send(
          "/api/weights/import",
          "POST",
          {
            entries: [
              { date: "2025-01-01", weightKg: 77 },
              { date: "2025-01-02", weightKg: -1 },
            ],
          },
          cookie,
        )
      ).status,
    ).toBe(400);
  });
  it("persists settings and validates targets", async () => {
    const cookie = await login();
    expect(
      (await send("/api/settings", "PUT", { unit: "lb", targetWeightKg: 76.5 }, cookie)).status,
    ).toBe(200);
    expect(await (await send("/api/settings", "GET", undefined, cookie)).json()).toEqual({
      unit: "lb",
      targetWeightKg: 76.5,
    });
    expect(
      (await send("/api/settings", "PUT", { unit: "kg", targetWeightKg: 0 }, cookie)).status,
    ).toBe(400);
  });
});
describe("environment validation", () => {
  it("rejects example passwords, weak secrets, invalid ports and wildcard origins", () => {
    const valid = {
      DATABASE_URL: "postgres://fixture:fixture@localhost/moonweight",
      ADMIN_PASSWORD: "fictional-test-password",
      SESSION_SECRET: "fictional-test-secret-with-32-characters",
    };
    expect(parseEnvironment(valid).port).toBe(3001);
    expect(() => parseEnvironment({ ...valid, SESSION_SECRET: "short" })).toThrow("SESSION_SECRET");
    expect(() => parseEnvironment({ ...valid, ADMIN_PASSWORD: "replace-with-a-password" })).toThrow(
      "ADMIN_PASSWORD",
    );
    expect(() => parseEnvironment({ ...valid, API_PORT: "65536" })).toThrow("API_PORT");
    expect(() => parseEnvironment({ ...valid, CORS_ORIGIN: "*" })).toThrow("CORS_ORIGIN");
    expect(() =>
      parseEnvironment({
        ...valid,
        NODE_ENV: "production",
        CORS_ORIGIN: "http://public.example",
        COOKIE_SECURE: "false",
      }),
    ).toThrow("HTTPS");
    expect(
      parseEnvironment({ ...valid, NODE_ENV: "production", CORS_ORIGIN: "https://tracker.example" })
        .cookieSecure,
    ).toBe(true);
  });
});
describe("bounded login attempts", () => {
  it("returns 429 after ten failed attempts and recovers when the window expires", async () => {
    let now = Date.now() + 16 * 60_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    for (let i = 0; i < 10; i++)
      expect((await send("/api/auth/login", "POST", { password: "incorrect" })).status).toBe(401);
    const limited = await send("/api/auth/login", "POST", { password: process.env.ADMIN_PASSWORD });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("900");
    now += 16 * 60_000;
    expect(
      (await send("/api/auth/login", "POST", { password: process.env.ADMIN_PASSWORD })).status,
    ).toBe(200);
  });
});
