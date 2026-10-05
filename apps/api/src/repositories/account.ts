import type { SetupAccountInput } from "@moonweight/shared";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { personalAccount, sessions } from "../db/schema.js";
import { hashPassword } from "../auth/password.js";

export const getAccount = async () => {
  const [account] = await db
    .select()
    .from(personalAccount)
    .where(eq(personalAccount.id, 1))
    .limit(1);
  return account ?? null;
};
export const createAccount = async (input: Pick<SetupAccountInput, "username" | "password">) => {
  // Derive outside the transaction so a slow password hash does not hold a database lock.
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(76492012)`);
    const [existing] = await tx.select({ id: personalAccount.id }).from(personalAccount).limit(1);
    if (existing) return false;
    await tx.insert(personalAccount).values({ id: 1, username: input.username, passwordHash });
    await tx.delete(sessions);
    return true;
  });
};
