import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const weightEntries = pgTable("weight_entries", {
  id: uuid("id").primaryKey(),
  weightKg: numeric("weight_kg", {
    precision: 6,
    scale: 2,
  }).notNull(),
  date: timestamp("date", {
    withTimezone: true,
  }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export type WeightEntryRow = typeof weightEntries.$inferSelect;
