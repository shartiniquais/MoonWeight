import { loginInputSchema, setupAccountInputSchema } from "@moonweight/shared";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Hono } from "hono";
import { env } from "../config.js";
import { createAccount, getAccount } from "../repositories/account.js";
import { verifyPassword } from "../auth/password.js";
import {
  createSessionToken,
  CredentialsChangedError,
  revokeSession,
  sessionCookieMaxAge,
  sessionCookieName,
  verifyAdminPassword,
  verifySessionToken,
} from "../auth/session.js";

export const authRoutes = new Hono();
const cookieOptions = () => ({
  httpOnly: true,
  maxAge: sessionCookieMaxAge,
  path: "/",
  sameSite: "Strict" as const,
  secure: env.cookieSecure,
});
// Single-user deployment: global cap avoids trusting spoofable forwarding headers.
// Failed attempts are bounded in memory and expire; restarts clear the limiter.
const failures: number[] = [];
authRoutes.get("/auth/me", async (c) =>
  c.json({
    authenticated: await verifySessionToken(getCookie(c, sessionCookieName)),
    setupRequired: !(await getAccount()),
  }),
);
authRoutes.use("/auth/*", async (c, next) => {
  if (c.req.method !== "POST" || !["/api/auth/login", "/api/auth/setup"].includes(c.req.path))
    return next();
  const now = Date.now();
  while (failures.length && failures[0] <= now - 15 * 60_000) failures.shift();
  if (failures.length >= 10) {
    c.header("Retry-After", String(Math.ceil((failures[0] + 15 * 60_000 - now) / 1000)));
    return c.json({ error: "Too many sign-in attempts. Please try again later." }, 429);
  }
  await next();
  if ([400, 401, 403].includes(c.res.status)) failures.push(now);
});
authRoutes.post("/auth/setup", async (c) => {
  if (await getAccount())
    return c.json({ error: "This tracker already has an account. Please sign in." }, 409);
  const parsed = setupAccountInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return c.json({ error: "Check your account details", details: parsed.error.flatten() }, 400);
  if (!verifyAdminPassword(parsed.data.setupKey))
    return c.json(
      { error: "Setup key was not accepted. Check the key shown in your terminal." },
      403,
    );
  if (!(await createAccount(parsed.data)))
    return c.json({ error: "This tracker already has an account. Please sign in." }, 409);
  setCookie(c, sessionCookieName, await createSessionToken(), cookieOptions());
  failures.length = 0;
  return c.json({ authenticated: true, setupRequired: false }, 201);
});
authRoutes.post("/auth/login", async (c) => {
  const parsed = loginInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Enter a valid password" }, 400);
  }
  const account = await getAccount();
  // Check the password even for an unknown username to avoid a username timing oracle.
  const valid = account
    ? (await verifyPassword(parsed.data.password, account.passwordHash)) &&
      parsed.data.username === account.username
    : verifyAdminPassword(parsed.data.password);
  if (!valid) {
    return c.json({ error: "Unable to sign in. Check your credentials." }, 401);
  }
  // Replacing a session also revokes the previous token in this browser.
  await revokeSession(getCookie(c, sessionCookieName));
  try {
    setCookie(
      c,
      sessionCookieName,
      await createSessionToken(account?.passwordHash ?? env.adminPassword),
      cookieOptions(),
    );
  } catch (error) {
    if (error instanceof CredentialsChangedError)
      return c.json({ error: "Account setup changed. Please sign in again." }, 409);
    throw error;
  }
  failures.length = 0;
  return c.json({ authenticated: true, setupRequired: !account });
});
authRoutes.post("/auth/logout", async (c) => {
  await revokeSession(getCookie(c, sessionCookieName));
  deleteCookie(c, sessionCookieName, {
    path: "/",
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "Strict",
  });
  return c.json({ authenticated: false });
});
