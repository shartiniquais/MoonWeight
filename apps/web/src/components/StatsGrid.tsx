import { toDisplayWeight, type WeightStats, type WeightUnit } from "@moonweight/shared";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatEntryDate } from "../lib/date";
import { formatDelta, formatWeight } from "../lib/format";

export const StatsGrid = ({ stats, unit }: { stats: WeightStats; unit: WeightUnit }) => {
  const latest = stats.latest;
  const metrics = [
    {
      label: "7-day change",
      value: formatDelta(stats.delta7DaysKg, unit),
      help: stats.comparison7Date
        ? `Since ${formatEntryDate(stats.comparison7Date)}`
        : "More nearby readings needed",
    },
    {
      label: "30-day change",
      value: formatDelta(stats.delta30DaysKg, unit),
      help: stats.comparison30Date
        ? `Since ${formatEntryDate(stats.comparison30Date)}`
        : "More nearby readings needed",
    },
    {
      label: "Overall change",
      value: formatDelta(stats.overallChangeKg, unit),
      help: "First to latest reading",
    },
    {
      label: "Lowest recorded",
      value: formatWeight(stats.lowestWeightKg, unit),
      help: "Across your history",
    },
    {
      label: "Highest recorded",
      value: formatWeight(stats.highestWeightKg, unit),
      help: "Across your history",
    },
    {
      label: "Total entries",
      value: String(stats.totalEntries),
      help: stats.totalEntries === 1 ? "The beginning of a picture" : "Small moments, recorded",
    },
  ];
  const DeltaIcon =
    (stats.deltaPreviousKg ?? 0) < 0
      ? ArrowDownRight
      : (stats.deltaPreviousKg ?? 0) > 0
        ? ArrowUpRight
        : Minus;
  return (
    <section className="stats-section" aria-label="Weight statistics">
      <div className="latest-card">
        <div className="lunar-orb" aria-hidden="true" />
        <p className="eyebrow">LATEST READING</p>
        <p className="latest-number">
          {latest ? toDisplayWeight(latest.weightKg, unit).toFixed(1) : "—"}
          <span>{unit}</span>
        </p>
        <p className="latest-date">
          {latest ? formatEntryDate(latest.date) : "Your first entry starts the story"}
        </p>
        <div className="previous-change">
          <DeltaIcon size={17} />
          <strong>{formatDelta(stats.deltaPreviousKg, unit)}</strong>
          <span>from previous entry</span>
        </div>
      </div>
      <dl className="metric-grid">
        {metrics.map((metric) => (
          <div className="metric" key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>
              {metric.value}
              <span className="metric-help">{metric.help}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
