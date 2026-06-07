import { timingSafeEqual, createHmac } from "node:crypto";

import { env } from "../config.js";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

type SessionPayload = {
  sub: "admin";
  exp: number;
};

const base64UrlEncode = (value: string | Buffer) => Buffer.from(value).toString("base64url");

const base64UrlDecode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const sign = (value: string) => createHmac("sha256", env.sessionSecret).update(value).digest("base64url");

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const sessionCookieName = "moonweight_session";

export const sessionCookieMaxAge = SESSION_DURATION_SECONDS;

export const createSessionToken = () => {
  const payload: SessionPayload = {
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
};

export const verifySessionToken = (token?: string) => {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !safeEqual(sign(encodedPayload), signature)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    return payload.sub === "admin" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
};

export const verifyAdminPassword = (password: string) => safeEqual(password, env.adminPassword);
