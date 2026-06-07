import type { WeightEntry } from "@moonweight/shared";
import { LineChart as LineChartIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatChartDate, formatEntryDate } from "../lib/date";
import { formatKg } from "../lib/format";

type ChartRange = "7d" | "30d" | "3m" | "all";

const rangeOptions: Array<{ label: string; value: ChartRange; days?: number }> = [
  {
    label: "7D",
    value: "7d",
    days: 7,
  },
  {
    label: "30D",
    value: "30d",
    days: 30,
  },
  {
    label: "3M",
    value: "3m",
    days: 90,
  },
  {
    label: "All",
    value: "all",
  },
];

type ChartPoint = {
  id: string;
  label: string;
  fullDate: string;
  weightKg: number;
  note?: string;
};

const ChartTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint; value: number }>;
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-lavender/30 bg-night/95 px-3 py-2 shadow-glow">
      <p className="text-sm font-semibold text-bone">{formatKg(point.weightKg)}</p>
      <p className="text-xs text-periwinkle">{formatEntryDate(point.fullDate)}</p>
      {point.note ? <p className="mt-1 max-w-52 text-xs text-bone/80">{point.note}</p> : null}
    </div>
  );
};

type WeightChartProps = {
  entries: WeightEntry[];
};

export const WeightChart = ({ entries }: WeightChartProps) => {
  const [range, setRange] = useState<ChartRange>("30d");

  const data = useMemo(() => {
    const selectedRange = rangeOptions.find((option) => option.value === range);
    const latest = entries[0];
    const cutoff =
      selectedRange?.days && latest
        ? new Date(latest.date).getTime() - selectedRange.days * 24 * 60 * 60 * 1000
        : null;

    return entries
      .filter((entry) => (cutoff ? new Date(entry.date).getTime() >= cutoff : true))
      .slice()
      .reverse()
      .map((entry) => ({
        id: entry.id,
        label: formatChartDate(entry.date),
        fullDate: entry.date,
        weightKg: entry.weightKg,
        note: entry.note,
      }));
  }, [entries, range]);

  return (
    <section className="rounded-lg border border-white/10 bg-card/80 p-4 shadow-insetline sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-lavender" />
          <h2 className="text-lg font-semibold text-bone">Evolution</h2>
        </div>
        <div className="grid grid-cols-4 rounded-lg border border-white/10 bg-night/60 p-1">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              className={`min-h-11 rounded-md px-2 text-sm font-medium transition sm:min-h-9 sm:px-3 ${
                range === option.value ? "bg-violet text-white" : "text-periwinkle hover:text-bone"
              }`}
              type="button"
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full sm:h-80">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-night/35 text-center text-sm text-periwinkle">
            Add the first entry to draw the line.
          </div>
        ) : (
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(165, 180, 252, 0.12)" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                minTickGap={20}
                tick={{ fill: "#A5B4FC", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                domain={["dataMin - 2", "dataMax + 2"]}
                tick={{ fill: "#A5B4FC", fontSize: 12 }}
                tickFormatter={(value) => `${value}`}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#C084FC", strokeWidth: 1 }} />
              <Line
                activeDot={{ r: 6, stroke: "#F3E8FF", strokeWidth: 2 }}
                dataKey="weightKg"
                dot={{ r: 3, strokeWidth: 2, fill: "#070A1F" }}
                stroke="#C084FC"
                strokeWidth={3}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
};
