import { timingSafeEqual, createHmac, randomBytes } from "node:crypto";
import { and, eq, gt, lte } from "drizzle-orm";
import { env } from "../config.js";
import { db } from "../db/client.js";
import { sessions } from "../db/schema.js";

export const sessionCookieName = "moonweight_session";
export const sessionCookieMaxAge = 60 * 60 * 24 * 30;
// Changing either secret or password invalidates every existing session.
const hashToken = (token: string) =>
  createHmac("sha256", env.sessionSecret)
    .update(env.adminPassword)
    .update("\0")
    .update(token)
    .digest("hex");
const passwordDigest = (value: string) =>
  createHmac("sha256", env.sessionSecret).update(value).digest();
export const verifyAdminPassword = (password: string) =>
  timingSafeEqual(passwordDigest(password), passwordDigest(env.adminPassword));
export const createSessionToken = async () => {
  const token = randomBytes(32).toString("base64url");
  await db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + sessionCookieMaxAge * 1000),
  });
  return token;
};
export const verifySessionToken = async (token?: string) => {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const [row] = await db
    .select({ tokenHash: sessions.tokenHash })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return Boolean(row);
};
export const revokeSession = async (token?: string) => {
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token))
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
};
