import { randomUUID } from "node:crypto";
import { shiftDays, roundKg } from "@moonweight/shared";
import { sql } from "drizzle-orm";
import { db, postgresClient } from "./db/client.js";
import { appSettings, weightEntries } from "./db/schema.js";
import { migrate } from "./migrate.js";

try {
  await migrate();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(76492011)`);
    const rows = await tx.select({ id: weightEntries.id }).from(weightEntries).limit(1);
    const [settings] = await tx.select().from(appSettings);
    if (rows.length || settings.targetWeightKg !== null || settings.unit !== "kg")
      throw new Error(
        "Demo seed requires an empty tracker with default settings. Use a separate demo database; existing data is never overwritten.",
      );
    const today = new Date().toISOString().slice(0, 10);
    const notes = [
      "[DEMO] Fictional sample data. An ordinary morning.",
      "[DEMO] A weekend away; back to the usual routine.",
      "[DEMO] New month, same small habit.",
      "[DEMO] Evening reading for a change.",
      "[DEMO] A quiet Sunday at home.",
    ];
    const entries = Array.from({ length: 121 }, (_, index) => ({
      id: randomUUID(),
      date: shiftDays(today, (-180 + index * 1.5) | 0),
      weightKg: roundKg(
        83.2 - index * 0.047 + Math.sin(index * 1.7) * 0.36 + Math.cos(index * 0.3) * 0.18,
      ).toString(),
      note: index % 24 === 0 ? notes[(index / 24) % notes.length] : null,
    }));
    await tx.insert(weightEntries).values(entries);
    await tx.update(appSettings).set({ targetWeightKg: "76", unit: "kg" });
    console.log("Created 121 fictional demo readings and a 76 kg demonstration target.");
  });
} catch (error) {
  console.error(
    error instanceof Error && error.message.startsWith("Demo seed")
      ? error.message
      : "Demo seed failed. Check configuration and database connectivity.",
  );
  process.exitCode = 1;
} finally {
  await postgresClient.end();
}
