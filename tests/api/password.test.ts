import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../apps/api/src/auth/password.js";

describe("account password storage", () => {
  it("uses random salts and rejects wrong passwords and malformed hashes", async () => {
    const password = "fictional-long-passphrase";
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword("wrong", first)).toBe(false);
    expect(await verifyPassword(password, "scrypt$unsafe-parameters")).toBe(false);
  });
});
