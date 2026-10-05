import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { sessionCookieName, verifySessionToken } from "../auth/session.js";

export const requireAuth = createMiddleware(async (c, next) => {
  if (!(await verifySessionToken(getCookie(c, sessionCookieName))))
    return c.json({ error: "Authentication required" }, 401);
  await next();
});
