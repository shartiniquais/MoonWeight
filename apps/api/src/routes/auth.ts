import { loginInputSchema } from "@moonweight/shared";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Hono } from "hono";
import { env } from "../config.js";
import {
  createSessionToken,
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
  c.json({ authenticated: await verifySessionToken(getCookie(c, sessionCookieName)) }),
);
authRoutes.post("/auth/login", async (c) => {
  const now = Date.now();
  while (failures.length && failures[0] <= now - 15 * 60_000) failures.shift();
  if (failures.length >= 10) {
    c.header("Retry-After", String(Math.ceil((failures[0] + 15 * 60_000 - now) / 1000)));
    return c.json({ error: "Too many sign-in attempts. Please try again later." }, 429);
  }
  const parsed = loginInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    failures.push(now);
    return c.json({ error: "Enter a valid password" }, 400);
  }
  if (!verifyAdminPassword(parsed.data.password)) {
    failures.push(now);
    return c.json({ error: "Unable to sign in. Check your password." }, 401);
  }
  // Replacing a session also revokes the previous token in this browser.
  await revokeSession(getCookie(c, sessionCookieName));
  setCookie(c, sessionCookieName, await createSessionToken(), cookieOptions());
  return c.json({ authenticated: true });
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
