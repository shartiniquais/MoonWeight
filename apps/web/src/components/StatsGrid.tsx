import type { WeightStats } from "@moonweight/shared";
import { Activity, ArrowDown, ArrowUp, BarChart3, CalendarClock, Scale, TrendingUp } from "lucide-react";
import type { ComponentType } from "react";

import { deltaClass, formatDelta, formatKg } from "../lib/format";

type StatCardProps = {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  valueClassName?: string;
};

const StatCard = ({ label, value, icon: Icon, valueClassName = "text-bone" }: StatCardProps) => (
  <div className="rounded-lg border border-white/10 bg-card/80 p-3 shadow-insetline sm:p-4">
    <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
      <span className="truncate text-sm text-periwinkle">{label}</span>
      <Icon className="h-4 w-4 text-lavender" />
    </div>
    <p className={`text-xl font-semibold sm:text-2xl ${valueClassName}`}>{value}</p>
  </div>
);

type StatsGridProps = {
  stats: WeightStats | null;
};

export const StatsGrid = ({ stats }: StatsGridProps) => (
  <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <StatCard label="Latest" value={formatKg(stats?.latest?.weightKg)} icon={Scale} />
    <StatCard
      label="Previous"
      value={formatDelta(stats?.deltaPreviousKg)}
      icon={Activity}
      valueClassName={deltaClass(stats?.deltaPreviousKg)}
    />
    <StatCard
      label="7 days"
      value={formatDelta(stats?.delta7DaysKg)}
      icon={CalendarClock}
      valueClassName={deltaClass(stats?.delta7DaysKg)}
    />
    <StatCard
      label="30 days"
      value={formatDelta(stats?.delta30DaysKg)}
      icon={TrendingUp}
      valueClassName={deltaClass(stats?.delta30DaysKg)}
    />
    <StatCard label="Lowest" value={formatKg(stats?.lowestWeightKg)} icon={ArrowDown} valueClassName="text-success" />
    <StatCard label="Highest" value={formatKg(stats?.highestWeightKg)} icon={ArrowUp} valueClassName="text-danger" />
    <StatCard label="Entries" value={`${stats?.totalEntries ?? 0}`} icon={BarChart3} />
  </section>
);
