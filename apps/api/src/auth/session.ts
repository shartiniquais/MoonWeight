import { timingSafeEqual, createHmac, randomBytes } from "node:crypto";
import { and, eq, gt, lte, sql } from "drizzle-orm";
import { env } from "../config.js";
import { db } from "../db/client.js";
import { personalAccount, sessions } from "../db/schema.js";
import { getAccount } from "../repositories/account.js";

export const sessionCookieName = "moonweight_session";
export const sessionCookieMaxAge = 60 * 60 * 24 * 30;
// Binding to the current credential also invalidates sessions after account creation/reset.
const hashTokenWithCredential = (token: string, credential: string) =>
  createHmac("sha256", env.sessionSecret)
    .update(credential)
    .update("\0")
    .update(token)
    .digest("hex");
const hashToken = async (token: string) =>
  hashTokenWithCredential(token, (await getAccount())?.passwordHash ?? env.adminPassword);
export class CredentialsChangedError extends Error {}
const passwordDigest = (value: string) =>
  createHmac("sha256", env.sessionSecret).update(value).digest();
export const verifyAdminPassword = (password: string) =>
  timingSafeEqual(passwordDigest(password), passwordDigest(env.adminPassword));
export const createSessionToken = async (expectedCredential?: string) => {
  const credential = expectedCredential ?? (await getAccount())?.passwordHash ?? env.adminPassword;
  const token = randomBytes(32).toString("base64url");
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(76492012)`);
    const [account] = await tx.select().from(personalAccount).limit(1);
    if ((account?.passwordHash ?? env.adminPassword) !== credential)
      throw new CredentialsChangedError();
    await tx.delete(sessions).where(lte(sessions.expiresAt, new Date()));
    await tx.insert(sessions).values({
      tokenHash: hashTokenWithCredential(token, credential),
      expiresAt: new Date(Date.now() + sessionCookieMaxAge * 1000),
    });
  });
  return token;
};
export const verifySessionToken = async (token?: string) => {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const [row] = await db
    .select({ tokenHash: sessions.tokenHash })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, await hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return Boolean(row);
};
export const revokeSession = async (token?: string) => {
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token))
    await db.delete(sessions).where(eq(sessions.tokenHash, await hashToken(token)));
};
