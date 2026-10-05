import { type WeightEntry, type WeightUnit } from "@moonweight/shared";
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { formatEntryDate } from "../lib/date";
import { formatWeight } from "../lib/format";

const PAGE_SIZE = 12;
export const HistoryList = ({
  entries,
  saving,
  unit,
  onEdit,
  onDelete,
}: {
  entries: WeightEntry[];
  saving: boolean;
  unit: WeightUnit;
  onEdit: (entry: WeightEntry) => void;
  onDelete: (entry: WeightEntry) => void;
}) => {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(
    () =>
      entries.filter((entry) =>
        `${entry.date} ${formatEntryDate(entry.date)} ${entry.note ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [entries, query],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const start = currentPage * PAGE_SIZE;
  return (
    <section id="history" className="panel history-panel">
      <div className="history-heading">
        <div>
          <p className="eyebrow">THE SMALL MOMENTS</p>
          <h2>
            Your history <span className="count-pill">{entries.length}</span>
          </h2>
        </div>
        <div className="search-input">
          <Search size={16} />
          <label className="sr-only" htmlFor="history-search">
            Search history
          </label>
          <input
            id="history-search"
            placeholder="Search dates or notes"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>
      {!entries.length ? (
        <div className="history-empty">
          <p>No readings yet.</p>
          <span>Your entries will be kept here, ready whenever you need them.</span>
        </div>
      ) : !filtered.length ? (
        <div className="history-empty">
          <p>No matching entries.</p>
          <button type="button" className="text-button" onClick={() => setQuery("")}>
            Clear search
          </button>
        </div>
      ) : (
        <>
          <div className="history-labels" aria-hidden="true">
            <span>Date</span>
            <span>Weight</span>
            <span>Note</span>
            <span />
          </div>
          <div>
            {filtered.slice(start, start + PAGE_SIZE).map((entry) => (
              <article
                key={entry.id}
                className="history-row"
                aria-label={`Reading on ${formatEntryDate(entry.date)}`}
              >
                <time className="history-date" dateTime={entry.date}>
                  {formatEntryDate(entry.date)}
                </time>
                <strong className="history-weight">{formatWeight(entry.weightKg, unit, 2)}</strong>
                <p className="history-note">{entry.note || <span className="no-note">—</span>}</p>
                <div className="history-actions">
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Edit entry from ${formatEntryDate(entry.date)}`}
                    title="Edit entry"
                    disabled={saving}
                    onClick={() => onEdit(entry)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button danger-button"
                    type="button"
                    aria-label={`Delete entry from ${formatEntryDate(entry.date)}`}
                    title="Delete entry"
                    disabled={saving}
                    onClick={() => onDelete(entry)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="history-footer">
            <span>
              {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
              entries
            </span>
            <div className="pagination">
              <button
                className="icon-button"
                aria-label="Previous page"
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0}
              >
                <ChevronLeft size={17} />
              </button>
              <span>
                {currentPage + 1} / {pages}
              </span>
              <button
                className="icon-button"
                aria-label="Next page"
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage + 1 >= pages}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
