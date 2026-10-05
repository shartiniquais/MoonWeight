import { date, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const weightEntries = pgTable("weight_entries", {
  id: uuid("id").primaryKey(),
  weightKg: numeric("weight_kg", { precision: 7, scale: 3 }).notNull(),
  date: date("date", { mode: "string" }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  unit: text("unit").notNull().default("kg"),
  targetWeightKg: numeric("target_weight_kg", { precision: 7, scale: 3 }),
});
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export type WeightEntryRow = typeof weightEntries.$inferSelect;
