import { toDisplayWeight, type WeightUnit } from "@moonweight/shared";
export const formatWeight = (
  value: number | null | undefined,
  unit: WeightUnit = "kg",
  digits = 1,
) => (value == null ? "—" : `${toDisplayWeight(value, unit).toFixed(digits)} ${unit}`);
export const formatDelta = (value: number | null | undefined, unit: WeightUnit = "kg") => {
  if (value == null) return "—";
  const display = toDisplayWeight(value, unit);
  const rounded = Number(display.toFixed(1));
  return `${rounded > 0 ? "+" : ""}${(Object.is(rounded, -0) ? 0 : rounded).toFixed(1)} ${unit}`;
};
