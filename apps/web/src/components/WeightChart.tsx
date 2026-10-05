import {
  dayTimestamp,
  entriesInRange,
  toDisplayWeight,
  type ChartRange,
  type WeightEntry,
  type AppSettings,
} from "@moonweight/shared";
import { ArrowRight, Target } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartDate, formatEntryDate } from "../lib/date";
import { formatDelta, formatWeight } from "../lib/format";

type Point = WeightEntry & { time: number; value: number };
const ChartTooltip = ({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  unit: AppSettings["unit"];
}) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p className="eyebrow">{formatEntryDate(point.date)}</p>
      <strong>{formatWeight(point.weightKg, unit, 2)}</strong>
      {point.note && <p className="tooltip-note">{point.note}</p>}
    </div>
  );
};
export const WeightChart = ({
  entries,
  settings,
}: {
  entries: WeightEntry[];
  settings: AppSettings;
}) => {
  const [range, setRange] = useState<ChartRange>("30d");
  const data = useMemo(
    () =>
      entriesInRange(entries, range).map((entry) => ({
        ...entry,
        time: dayTimestamp(entry.date),
        value: toDisplayWeight(entry.weightKg, settings.unit),
      })),
    [entries, range, settings.unit],
  );
  const first = data[0];
  const latest = data.at(-1);
  const target =
    settings.targetWeightKg === null
      ? null
      : toDisplayWeight(settings.targetWeightKg, settings.unit);
  const values = data.map((point) => point.value);
  if (target !== null) values.push(target);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const padding = Math.max((max - min) * 0.18, settings.unit === "kg" ? 0.6 : 1.3);
  const xDomain: [number, number] =
    first && latest
      ? first.time === latest.time
        ? [first.time - 43_200_000, latest.time + 43_200_000]
        : [first.time, latest.time]
      : [0, 1];
  return (
    <section className="panel chart-panel" aria-label="Weight chart">
      <div className="chart-heading">
        <div>
          <p className="eyebrow">WEIGHT OVER TIME</p>
          <h2>The longer view</h2>
        </div>
        <div className="segmented" role="group" aria-label="Chart time range">
          {(["7d", "30d", "3m", "all"] as ChartRange[]).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={range === value}
              onClick={() => setRange(value)}
            >
              {{ "7d": "7 days", "30d": "30 days", "3m": "3 months", all: "All time" }[value]}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-summary">
        <div>
          {first && latest ? (
            <>
              <strong>{formatWeight(first.weightKg, settings.unit)}</strong>
              <ArrowRight size={14} />
              <strong>{formatWeight(latest.weightKg, settings.unit)}</strong>
              <span className="chart-delta">
                {data.length > 1
                  ? formatDelta(latest.weightKg - first.weightKg, settings.unit)
                  : "First reading"}
              </span>
            </>
          ) : (
            <span className="muted">Your story takes shape with each reading.</span>
          )}
        </div>
        {target !== null && (
          <span className="target-label">
            <Target size={14} />
            Target {formatWeight(settings.targetWeightKg, settings.unit)}
          </span>
        )}
      </div>
      <div className="chart-canvas">
        {!data.length ? (
          <div className="chart-empty">
            <div className="empty-moon" aria-hidden="true" />
            <h3>A little data goes a long way.</h3>
            <p>Add your first reading to begin your chart.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
              data={data}
              margin={{ top: 20, right: 18, bottom: 4, left: -15 }}
              accessibilityLayer
            >
              <defs>
                <linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#bac4ff" stopOpacity={0.17} />
                  <stop offset="100%" stopColor="#bac4ff" stopOpacity={0.005} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#283141" strokeDasharray="3 5" vertical={false} />
              <XAxis
                type="number"
                scale="time"
                dataKey="time"
                domain={xDomain}
                tickFormatter={formatChartDate}
                minTickGap={36}
                tick={{ fill: "#9aa7bd", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                domain={[Math.max(0, min - padding), max + padding]}
                tickFormatter={(value) => Number(value).toFixed(1)}
                tick={{ fill: "#9aa7bd", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={64}
                tickCount={5}
              />
              <Tooltip
                content={<ChartTooltip unit={settings.unit} />}
                cursor={{ stroke: "#64728c", strokeDasharray: "4 4" }}
              />
              {target !== null && (
                <ReferenceLine y={target} stroke="#8c9cac" strokeDasharray="6 6" />
              )}
              <Area
                dataKey="value"
                type="linear"
                stroke="#c5cdff"
                strokeWidth={2.4}
                fill="url(#weight-fill)"
                isAnimationActive={false}
                activeDot={{ r: 6, fill: "#c5cdff", stroke: "#121923", strokeWidth: 3 }}
                dot={(props: { cx?: number; cy?: number; payload?: Point }) => (
                  <circle
                    key={props.payload?.id}
                    cx={props.cx}
                    cy={props.cy}
                    r={props.payload?.id === latest?.id ? 5 : data.length < 15 ? 3 : 0}
                    fill={props.payload?.id === latest?.id ? "#e7ebff" : "#121923"}
                    stroke="#c5cdff"
                    strokeWidth={2}
                  />
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="chart-footer">
        <span>
          <i className="legend-dot" />
          Recorded weight · {settings.unit}
          {target !== null && (
            <>
              <i className="legend-dash" />
              Target
            </>
          )}
        </span>
        <span>
          {data.length} readings{latest ? ` · ending ${formatEntryDate(latest.date)}` : ""}
        </span>
      </div>
      <p className="chart-caption">
        Lines connect recorded readings. Missing days are never filled in.
      </p>
    </section>
  );
};
