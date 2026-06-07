export const todayInputValue = () => {
  const date = new Date();
  return toDateInputValue(date.toISOString());
};

export const toDateInputValue = (value: string) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const dateInputToIso = (value: string) => new Date(`${value}T12:00:00`).toISOString();

export const formatEntryDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const formatChartDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
