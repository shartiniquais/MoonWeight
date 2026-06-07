import { loginInputSchema, type ApiError, type AuthStatus } from "@moonweight/shared";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Hono } from "hono";

import { env } from "../config.js";
import {
  createSessionToken,
  sessionCookieMaxAge,
  sessionCookieName,
  verifyAdminPassword,
  verifySessionToken,
} from "../auth/session.js";

export const authRoutes = new Hono();

const cookieOptions = {
  httpOnly: true,
  maxAge: sessionCookieMaxAge,
  path: "/",
  sameSite: "Lax" as const,
  secure: env.isProduction,
};

const readJson = async (request: Request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

authRoutes.get("/auth/me", (c) => {
  const authenticated = verifySessionToken(getCookie(c, sessionCookieName));
  return c.json<AuthStatus>({ authenticated });
});

authRoutes.post("/auth/login", async (c) => {
  const body = await readJson(c.req.raw);
  const parsed = loginInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json<ApiError>(
      {
        error: "Invalid login request",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    return c.json<ApiError>({ error: "Invalid password" }, 401);
  }

  setCookie(c, sessionCookieName, createSessionToken(), cookieOptions);
  return c.json<AuthStatus>({ authenticated: true });
});

authRoutes.post("/auth/logout", (c) => {
  deleteCookie(c, sessionCookieName, {
    path: "/",
    secure: env.isProduction,
  });

  return c.json<AuthStatus>({ authenticated: false });
});
