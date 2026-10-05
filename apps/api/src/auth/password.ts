import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

let active = 0;
const derive = async (password: string, salt: string) => {
  if (active >= 2) throw new Error("Password verification is busy");
  active++;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        password,
        salt,
        64,
        { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
        (error, key) => {
          if (error) reject(error);
          else resolve(key);
        },
      );
    });
  } finally {
    active--;
  }
};
export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt$32768$8$1$${salt}$${key.toString("hex")}`;
};
export const verifyPassword = async (password: string, encoded: string) => {
  const match = /^scrypt\$32768\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded);
  if (!match) return false;
  return timingSafeEqual(await derive(password, match[1]), Buffer.from(match[2], "hex"));
};
