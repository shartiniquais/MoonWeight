import type { ApiError } from "@moonweight/shared";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

import { sessionCookieName, verifySessionToken } from "../auth/session.js";

export const requireAuth = createMiddleware(async (c, next) => {
  const token = getCookie(c, sessionCookieName);

  if (!verifySessionToken(token)) {
    return c.json<ApiError>({ error: "Authentication required" }, 401);
  }

  await next();
});
