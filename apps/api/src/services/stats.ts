import type { WeightEntry, WeightStats } from "@moonweight/shared";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const roundDelta = (value: number) => Math.round(value * 10) / 10;

const differenceSinceDays = (entries: WeightEntry[], days: number) => {
  const latest = entries[0];

  if (!latest) {
    return null;
  }

  const threshold = new Date(latest.date).getTime() - days * DAY_IN_MS;
  const comparison = entries.find((entry) => new Date(entry.date).getTime() <= threshold);

  if (!comparison) {
    return null;
  }

  return roundDelta(latest.weightKg - comparison.weightKg);
};

export const buildWeightStats = (entries: WeightEntry[]): WeightStats => {
  const latest = entries[0] ?? null;
  const previous = entries[1] ?? null;

  return {
    latest,
    deltaPreviousKg: latest && previous ? roundDelta(latest.weightKg - previous.weightKg) : null,
    delta7DaysKg: differenceSinceDays(entries, 7),
    delta30DaysKg: differenceSinceDays(entries, 30),
    lowestWeightKg: entries.length > 0 ? Math.min(...entries.map((entry) => entry.weightKg)) : null,
    highestWeightKg: entries.length > 0 ? Math.max(...entries.map((entry) => entry.weightKg)) : null,
    totalEntries: entries.length,
  };
};
