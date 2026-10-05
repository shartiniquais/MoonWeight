import { describe, expect, it } from "vitest";
import {
  buildWeightStats,
  calendarDateSchema,
  createWeightEntryInputSchema,
  entriesInRange,
  exportCsv,
  previewCsv,
  rangeStart,
  settingsInputSchema,
  shiftDays,
  toDisplayWeight,
  toKilograms,
  updateWeightEntryInputSchema,
  type WeightEntry,
} from "@moonweight/shared";

const reading = (
  date: string,
  weightKg: number,
  id = date,
  createdAt = "2025-01-01T00:00:00.000Z",
): WeightEntry => ({ id, date, weightKg, createdAt, updatedAt: createdAt });
describe("strict shared validation", () => {
  it("rejects control characters that cannot be safely stored in notes", () => {
    expect(
      createWeightEntryInputSchema.safeParse({
        date: "2025-01-01",
        weightKg: 78,
        note: "invalid\u0000note",
      }).success,
    ).toBe(false);
  });
  it.each([
    "2025-02-29",
    "2024-04-31",
    "2025-13-01",
    "2025-01-32",
    "not-a-date",
    "2025-01-01T12:00:00Z",
    "1899-12-31",
    "2999-01-01",
  ])("rejects invalid date %s", (date) =>
    expect(calendarDateSchema.safeParse(date).success).toBe(false),
  );
  it("supports leap days and DST boundaries without changing calendar dates", () => {
    expect(calendarDateSchema.parse("2024-02-29")).toBe("2024-02-29");
    expect(shiftDays("2024-03-31", -1)).toBe("2024-03-30");
    expect(shiftDays("2024-10-27", 1)).toBe("2024-10-28");
  });
  it.each([0, -1, 0.01, 1001, Infinity, NaN, "72.2", true, null])(
    "rejects invalid weight %s",
    (weightKg) => {
      expect(createWeightEntryInputSchema.safeParse({ date: "2025-01-01", weightKg }).success).toBe(
        false,
      );
    },
  );
  it("rounds canonical kg, trims notes, rejects extra fields and long notes", () => {
    expect(
      createWeightEntryInputSchema.parse({
        date: "2025-01-01",
        weightKg: 72.3456,
        note: "  morning  ",
      }),
    ).toEqual({ date: "2025-01-01", weightKg: 72.346, note: "morning" });
    expect(
      createWeightEntryInputSchema.safeParse({
        date: "2025-01-01",
        weightKg: 72,
        note: "x".repeat(501),
      }).success,
    ).toBe(false);
    expect(
      createWeightEntryInputSchema.safeParse({ date: "2025-01-01", weightKg: 72, id: "untrusted" })
        .success,
    ).toBe(false);
  });
  it("allows clearing notes but forbids empty updates", () => {
    expect(updateWeightEntryInputSchema.parse({ note: " " })).toEqual({ note: null });
    expect(updateWeightEntryInputSchema.safeParse({}).success).toBe(false);
    expect(updateWeightEntryInputSchema.safeParse({ weightKg: "80" }).success).toBe(false);
  });
  it("validates settings and optional target", () => {
    expect(settingsInputSchema.parse({ unit: "lb", targetWeightKg: null }).unit).toBe("lb");
    expect(settingsInputSchema.safeParse({ unit: "stones", targetWeightKg: 76 }).success).toBe(
      false,
    );
    expect(settingsInputSchema.safeParse({ unit: "kg", targetWeightKg: -4 }).success).toBe(false);
  });
});
describe("statistics with honest baselines", () => {
  it("handles empty and one-entry trackers", () => {
    expect(buildWeightStats([])).toMatchObject({
      latest: null,
      totalEntries: 0,
      overallChangeKg: null,
      lowestWeightKg: null,
    });
    expect(buildWeightStats([reading("2025-05-01", 78)])).toMatchObject({
      deltaPreviousKg: null,
      delta7DaysKg: null,
      delta30DaysKg: null,
      overallChangeKg: null,
      lowestWeightKg: 78,
      highestWeightKg: 78,
    });
  });
  it("sorts inputs, calculates precise deltas and records actual baseline dates", () => {
    const entries = [
      reading("2025-04-01", 81.5),
      reading("2025-05-01", 78.125),
      reading("2025-04-23", 79),
      reading("2025-04-30", 78.5),
    ];
    const result = buildWeightStats(entries);
    expect(result).toMatchObject({
      totalEntries: 4,
      deltaPreviousKg: -0.375,
      delta7DaysKg: -0.875,
      delta30DaysKg: -3.375,
      comparison7Date: "2025-04-23",
      comparison30Date: "2025-04-01",
      overallChangeKg: -3.375,
      lowestWeightKg: 78.125,
      highestWeightKg: 81.5,
    });
    expect(entries[0].date).toBe("2025-04-01");
  });
  it("does not label distant sparse readings as 7/30-day changes", () => {
    const result = buildWeightStats([reading("2025-05-01", 78), reading("2025-01-01", 81)]);
    expect(result.delta7DaysKg).toBeNull();
    expect(result.delta30DaysKg).toBeNull();
    expect(result.overallChangeKg).toBe(-3);
  });
  it("uses the latest reading on a same-day baseline, with a stable ID tie-break", () => {
    const result = buildWeightStats([
      reading("2025-05-01", 78),
      reading("2025-04-24", 79, "a"),
      reading("2025-04-24", 80, "b"),
    ]);
    expect(result.delta7DaysKg).toBe(-2);
  });
});
describe("chart ranges", () => {
  it("includes exactly 7 calendar days ending with the latest reading", () => {
    expect(
      entriesInRange(
        [reading("2025-05-01", 78), reading("2025-04-25", 79), reading("2025-04-24", 80)],
        "7d",
      ).map((e) => e.date),
    ).toEqual(["2025-04-25", "2025-05-01"]);
  });
  it("uses calendar months and clamps month-end, including leap years", () => {
    expect(rangeStart("2025-05-31", "3m")).toBe("2025-02-28");
    expect(rangeStart("2024-05-31", "3m")).toBe("2024-02-29");
    expect(rangeStart("2025-01-01", "30d")).toBe("2024-12-03");
    expect(rangeStart("2025-05-01", "all")).toBeNull();
    expect(entriesInRange([], "all")).toEqual([]);
  });
});
describe("unit conversion", () => {
  it("round-trips stored values safely across display units", () => {
    for (const kg of [0.1, 72.345, 1000])
      expect(toKilograms(toDisplayWeight(kg, "lb"), "lb")).toBe(kg);
    expect(toDisplayWeight(1, "lb")).toBeCloseTo(2.2046226218);
  });
});
describe("CSV transfer", () => {
  it("round-trips comma, quote, multiline and formula-like notes", () => {
    for (const note of [
      "Weekend, away",
      'A "quiet" day',
      "line one\nline two",
      "=HYPERLINK(1)",
      "+123",
      "-formula",
      "@formula",
      "'=already quoted",
      " ordinary",
      "x".repeat(500),
    ]) {
      const entry = { ...reading("2025-05-01", 78.123), note: note.trim() };
      expect(previewCsv(exportCsv([entry]))[0].input).toMatchObject({
        date: entry.date,
        weightKg: entry.weightKg,
        note: entry.note,
      });
    }
    expect(exportCsv([{ ...reading("2025-05-01", 78), note: "=1+1" }])).toContain("'=1+1");
  });
  it("reports rejected rows and duplicate rows without silently dropping either", () => {
    const existing = reading("2025-05-01", 78);
    const rows = previewCsv(
      "date,weight_kg,note\n2025-05-01,78,\n2025-02-30,79,\n2025-05-02,77,\n2025-05-02,77,\n2025-05-03,nope,",
      [existing],
    );
    expect(rows.map((r) => r.duplicate)).toEqual([true, undefined, false, true, undefined]);
    expect(rows.filter((r) => r.error).map((r) => r.row)).toEqual([3, 6]);
  });
  it("rejects malformed headers, quoting, extra columns and oversized imports", () => {
    expect(() => previewCsv("date,weight,note\n2025-05-01,78,")).toThrow("Expected header");
    expect(() => previewCsv('date,weight_kg,note\n2025-05-01,78,"unfinished')).toThrow(
      "Unable to read CSV",
    );
    expect(previewCsv("date,weight_kg,note\n2025-05-01,78,note,extra")[0].error).toContain(
      "3 columns",
    );
    expect(() => previewCsv("x".repeat(1_048_577))).toThrow("1 MB");
    expect(() => previewCsv("date,weight_kg,note\n" + "2025-05-01,78,\n".repeat(1001))).toThrow(
      "1–1000",
    );
  });
});
