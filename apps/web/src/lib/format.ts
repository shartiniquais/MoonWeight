export const formatKg = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? "-" : `${value.toFixed(digits)} kg`;

export const formatDelta = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return "-";
  }

  if (value === 0) {
    return "0.0 kg";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(1)} kg`;
};

export const deltaClass = (value: number | null | undefined) => {
  if (value === null || value === undefined || value === 0) {
    return "text-bone";
  }

  return value < 0 ? "text-success" : "text-danger";
};
