import { type AppSettings } from "@moonweight/shared";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { appSettings } from "../db/schema.js";

export const getSettings = async (): Promise<AppSettings> => {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1));
  return {
    unit: row.unit as AppSettings["unit"],
    targetWeightKg: row.targetWeightKg === null ? null : Number(row.targetWeightKg),
  };
};
export const saveSettings = async (input: AppSettings) => {
  await db
    .update(appSettings)
    .set({ unit: input.unit, targetWeightKg: input.targetWeightKg?.toString() ?? null })
    .where(eq(appSettings.id, 1));
  return getSettings();
};
