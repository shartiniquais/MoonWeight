import type { CreateWeightEntryInput, UpdateWeightEntryInput, WeightEntry } from "@moonweight/shared";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "../db/client.js";
import { weightEntries, type WeightEntryRow } from "../db/schema.js";

const serializeWeightEntry = (entry: WeightEntryRow): WeightEntry => ({
  id: entry.id,
  weightKg: Number(entry.weightKg),
  date: entry.date.toISOString(),
  note: entry.note ?? undefined,
  createdAt: entry.createdAt.toISOString(),
  updatedAt: entry.updatedAt.toISOString(),
});

export const listWeightEntries = async () => {
  const rows = await db
    .select()
    .from(weightEntries)
    .orderBy(desc(weightEntries.date), desc(weightEntries.createdAt));

  return rows.map(serializeWeightEntry);
};

export const getWeightEntry = async (id: string) => {
  const [row] = await db.select().from(weightEntries).where(eq(weightEntries.id, id)).limit(1);
  return row ? serializeWeightEntry(row) : null;
};

export const createWeightEntry = async (input: CreateWeightEntryInput) => {
  const now = new Date();
  const [row] = await db
    .insert(weightEntries)
    .values({
      id: randomUUID(),
      weightKg: input.weightKg.toString(),
      date: new Date(input.date),
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return serializeWeightEntry(row);
};

export const updateWeightEntry = async (id: string, input: UpdateWeightEntryInput) => {
  const values: Partial<typeof weightEntries.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.weightKg !== undefined) {
    values.weightKg = input.weightKg.toString();
  }

  if (input.date !== undefined) {
    values.date = new Date(input.date);
  }

  if ("note" in input) {
    values.note = input.note ?? null;
  }

  const [row] = await db.update(weightEntries).set(values).where(eq(weightEntries.id, id)).returning();
  return row ? serializeWeightEntry(row) : null;
};

export const deleteWeightEntry = async (id: string) => {
  const [row] = await db.delete(weightEntries).where(eq(weightEntries.id, id)).returning({
    id: weightEntries.id,
  });

  return Boolean(row);
};
