import { z } from "zod";
import Papa from "papaparse";

export const MAX_NOTE_LENGTH = 500;
export const MAX_IMPORT_ROWS = 1000;
export const entryIdSchema = z.string().uuid();
export const KG_TO_LB = 2.2046226218487757;
export type WeightUnit = "kg" | "lb";
export const roundKg = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;
export const toDisplayWeight = (kg: number, unit: WeightUnit) =>
  unit === "lb" ? kg * KG_TO_LB : kg;
export const toKilograms = (value: number, unit: WeightUnit) =>
  roundKg(unit === "lb" ? value / KG_TO_LB : value);
export const DAY_MS = 86_400_000;
export const dayTimestamp = (date: string) => Date.parse(`${date}T00:00:00Z`);
export const shiftDays = (date: string, days: number) =>
  new Date(dayTimestamp(date) + days * DAY_MS).toISOString().slice(0, 10);
// Calendar dates have no timezone. Allow today's date anywhere in the world.
export const latestCalendarDate = () =>
  new Date(Date.now() + 14 * 3_600_000).toISOString().slice(0, 10);
export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format")
  .refine(
    (value) =>
      Number.isFinite(dayTimestamp(value)) &&
      new Date(dayTimestamp(value)).toISOString().slice(0, 10) === value,
    "Date must be a real calendar date",
  )
  .refine(
    (value) => value >= "1900-01-01" && value <= latestCalendarDate(),
    "Date must be between 1900 and today",
  );
export const weightKgSchema = z
  .number()
  .finite()
  .min(0.1, "Weight must be at least 0.1 kg")
  .max(1000, "Weight must be at most 1000 kg")
  .transform(roundKg);
const noteSchema = z
  .string()
  .trim()
  .max(MAX_NOTE_LENGTH, `Note must be ${MAX_NOTE_LENGTH} characters or less`)
  .refine(
    (value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value),
    "Note contains unsupported control characters",
  );
export const createWeightEntryInputSchema = z
  .object({
    weightKg: weightKgSchema,
    date: calendarDateSchema,
    note: noteSchema.optional().transform((value) => value || undefined),
  })
  .strict();
export const updateWeightEntryInputSchema = z
  .object({
    weightKg: weightKgSchema.optional(),
    date: calendarDateSchema.optional(),
    note: noteSchema
      .nullable()
      .optional()
      .transform((value) => (value === undefined ? undefined : value || null)),
  })
  .strict()
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    "Provide at least one field",
  );
export const loginInputSchema = z
  .object({
    username: z.string().trim().toLowerCase().max(32).optional(),
    password: z.string().min(1, "Password is required").max(1024),
  })
  .strict();
export const setupAccountInputSchema = z
  .object({
    setupKey: z.string().min(1, "Setup key is required").max(1024),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Username needs at least 3 characters")
      .max(32, "Username must be 32 characters or less")
      .regex(/^[a-z0-9][a-z0-9_.-]*$/, "Use letters, numbers, dots, dashes, or underscores"),
    password: z
      .string()
      .min(12, "Use at least 12 characters for your password")
      .max(128, "Password must be 128 characters or less"),
  })
  .strict();
export const settingsInputSchema = z
  .object({
    unit: z.enum(["kg", "lb"]),
    targetWeightKg: weightKgSchema.nullable(),
  })
  .strict();
export const importInputSchema = z
  .object({ entries: z.array(createWeightEntryInputSchema).min(1).max(MAX_IMPORT_ROWS) })
  .strict();
export type CreateWeightEntryInput = z.infer<typeof createWeightEntryInputSchema>;
export type UpdateWeightEntryInput = z.infer<typeof updateWeightEntryInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type SetupAccountInput = z.infer<typeof setupAccountInputSchema>;
export type AppSettings = z.infer<typeof settingsInputSchema>;
export type WeightEntry = CreateWeightEntryInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
export type AuthStatus = { authenticated: boolean; setupRequired?: boolean };
export type ApiError = {
  error: string;
  details?: { fieldErrors?: Record<string, string[] | undefined>; formErrors?: string[] };
};
export type ImportResult = { imported: number; skipped: number };
export type WeightStats = {
  latest: WeightEntry | null;
  deltaPreviousKg: number | null;
  delta7DaysKg: number | null;
  delta30DaysKg: number | null;
  comparison7Date: string | null;
  comparison30Date: string | null;
  overallChangeKg: number | null;
  lowestWeightKg: number | null;
  highestWeightKg: number | null;
  totalEntries: number;
};

// Dates first; createdAt and ID give same-day readings a stable order.
export const sortEntries = (entries: WeightEntry[]) =>
  [...entries].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt) ||
      b.id.localeCompare(a.id),
  );
export const buildWeightStats = (input: WeightEntry[]): WeightStats => {
  const entries = sortEntries(input);
  const latest = entries[0] ?? null;
  const previous = entries[1];
  const baseline = (days: number, tolerance: number) => {
    if (!latest) return undefined;
    const cutoff = shiftDays(latest.date, -days);
    return entries.find((e) => e.date <= cutoff && e.date >= shiftDays(cutoff, -tolerance));
  };
  const week = baseline(7, 3);
  const month = baseline(30, 7);
  const delta = (entry?: WeightEntry) =>
    latest && entry ? roundKg(latest.weightKg - entry.weightKg) : null;
  return {
    latest,
    deltaPreviousKg: delta(previous),
    delta7DaysKg: delta(week),
    delta30DaysKg: delta(month),
    comparison7Date: week?.date ?? null,
    comparison30Date: month?.date ?? null,
    overallChangeKg: entries.length > 1 ? delta(entries.at(-1)) : null,
    lowestWeightKg: entries.length
      ? entries.reduce((min, e) => Math.min(min, e.weightKg), Infinity)
      : null,
    highestWeightKg: entries.length
      ? entries.reduce((max, e) => Math.max(max, e.weightKg), -Infinity)
      : null,
    totalEntries: entries.length,
  };
};
export type ChartRange = "7d" | "30d" | "3m" | "all";
export const rangeStart = (latest: string, range: ChartRange): string | null => {
  if (range === "all") return null;
  if (range !== "3m") return shiftDays(latest, range === "7d" ? -6 : -29);
  const date = new Date(dayTimestamp(latest));
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 3);
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, end));
  return date.toISOString().slice(0, 10);
};
export const entriesInRange = (input: WeightEntry[], range: ChartRange) => {
  const entries = sortEntries(input);
  const start = entries[0] ? rangeStart(entries[0].date, range) : null;
  return entries.filter((e) => !start || e.date >= start).reverse();
};

export const entryKey = (entry: CreateWeightEntryInput) =>
  JSON.stringify([entry.date, roundKg(entry.weightKg), entry.note?.trim() || ""]);
// A reversible apostrophe escape stops spreadsheet formulas without changing stored notes.
const protectNote = (note: string) => (/^[\s]*[=+\-@]|^[\t\r\n']/.test(note) ? `'${note}` : note);
const unprotectNote = (note: string) =>
  note.startsWith("'") && protectNote(note.slice(1)).startsWith("'") ? note.slice(1) : note;
export const exportCsv = (entries: WeightEntry[]) =>
  Papa.unparse(
    {
      fields: ["date", "weight_kg", "note"],
      data: sortEntries(entries)
        .reverse()
        .map((e) => [e.date, e.weightKg.toFixed(3), protectNote(e.note ?? "")]),
    },
    { newline: "\r\n" },
  ).replace(/(?:\r\n)*$/, "") + "\r\n";
export type CsvPreviewRow = {
  row: number;
  input?: CreateWeightEntryInput;
  error?: string;
  duplicate?: boolean;
};
export const previewCsv = (csv: string, existing: WeightEntry[] = []): CsvPreviewRow[] => {
  if (new TextEncoder().encode(csv).length > 1_048_576)
    throw new Error("CSV must be 1 MB or smaller");
  const result = Papa.parse<string[]>(csv.replace(/^\uFEFF/, ""), {
    delimiter: ",",
    skipEmptyLines: "greedy",
  });
  if (result.errors.length) throw new Error(`Unable to read CSV: ${result.errors[0].message}`);
  const [header, ...rows] = result.data;
  if (!header || header.join(",") !== "date,weight_kg,note")
    throw new Error("Expected header: date,weight_kg,note");
  if (!rows.length || rows.length > MAX_IMPORT_ROWS)
    throw new Error(`CSV must contain 1–${MAX_IMPORT_ROWS} data rows`);
  const keys = new Set(existing.map(entryKey));
  return rows.map((row, index) => {
    if (row.length !== 3) return { row: index + 2, error: "Expected exactly 3 columns" };
    const parsed = createWeightEntryInputSchema.safeParse({
      date: row[0],
      weightKg: /^\d+(\.\d+)?$/.test(row[1]) ? Number(row[1]) : NaN,
      note: unprotectNote(row[2]),
    });
    if (!parsed.success)
      return { row: index + 2, error: parsed.error.issues.map((i) => i.message).join("; ") };
    const key = entryKey(parsed.data);
    const duplicate = keys.has(key);
    keys.add(key);
    return { row: index + 2, input: parsed.data, duplicate };
  });
};
