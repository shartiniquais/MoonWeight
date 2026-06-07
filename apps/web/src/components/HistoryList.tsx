import type { WeightEntry } from "@moonweight/shared";
import { Pencil, Trash2 } from "lucide-react";

import { formatEntryDate } from "../lib/date";
import { formatKg } from "../lib/format";

type HistoryListProps = {
  entries: WeightEntry[];
  editingId?: string;
  saving: boolean;
  onEdit: (entry: WeightEntry) => void;
  onDelete: (id: string) => Promise<void>;
};

export const HistoryList = ({ entries, editingId, saving, onEdit, onDelete }: HistoryListProps) => {
  const handleDelete = async (entry: WeightEntry) => {
    const confirmed = window.confirm(`Delete ${formatKg(entry.weightKg)} from ${formatEntryDate(entry.date)}?`);

    if (!confirmed) {
      return;
    }

    try {
      await onDelete(entry.id);
    } catch {
      // The parent hook surfaces the error message in the page.
    }
  };

  return (
    <section className="rounded-lg border border-white/10 bg-surface/70 p-4 shadow-insetline sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-bone">History</h2>
        <span className="text-sm text-periwinkle">{entries.length} entries</span>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-night/35 p-6 text-center text-sm text-periwinkle">
          No entries yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className={`grid gap-3 rounded-lg border p-4 shadow-insetline transition sm:grid-cols-[1fr_auto] sm:items-center ${
                editingId === entry.id
                  ? "border-lavender/70 bg-deep/70"
                  : "border-white/10 bg-card/80 hover:border-lavender/40"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-xl font-semibold text-bone">{formatKg(entry.weightKg)}</p>
                  <p className="text-sm text-periwinkle">{formatEntryDate(entry.date)}</p>
                </div>
                {entry.note ? <p className="mt-2 whitespace-pre-wrap text-sm text-bone/80">{entry.note}</p> : null}
              </div>
              <div className="flex justify-end gap-2 sm:justify-end">
                <button
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/10 text-periwinkle transition hover:border-lavender/60 hover:text-bone disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={() => onEdit(entry)}
                  disabled={saving}
                  title="Edit entry"
                  aria-label="Edit entry"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-danger/30 text-danger transition hover:bg-danger hover:text-night disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={() => void handleDelete(entry)}
                  disabled={saving}
                  title="Delete entry"
                  aria-label="Delete entry"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
