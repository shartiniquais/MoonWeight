import type { CreateWeightEntryInput, UpdateWeightEntryInput, WeightEntry } from "@moonweight/shared";
import { CalendarDays, Plus, Save, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { dateInputToIso, todayInputValue, toDateInputValue } from "../lib/date";

type EntryFormProps = {
  editingEntry: WeightEntry | null;
  focusKey: number;
  saving: boolean;
  onCancelEdit: () => void;
  onSubmit: (input: CreateWeightEntryInput | UpdateWeightEntryInput) => Promise<void>;
};

export const EntryForm = ({ editingEntry, focusKey, saving, onCancelEdit, onSubmit }: EntryFormProps) => {
  const [weightKg, setWeightKg] = useState("");
  const [date, setDate] = useState(todayInputValue);
  const [note, setNote] = useState("");
  const weightInputRef = useRef<HTMLInputElement | null>(null);

  const isEditing = Boolean(editingEntry);

  useEffect(() => {
    if (!editingEntry) {
      setWeightKg("");
      setDate(todayInputValue());
      setNote("");
      return;
    }

    setWeightKg(editingEntry.weightKg.toString());
    setDate(toDateInputValue(editingEntry.date));
    setNote(editingEntry.note ?? "");
  }, [editingEntry]);

  const title = useMemo(() => (isEditing ? "Edit entry" : "Add entry"), [isEditing]);

  useEffect(() => {
    if (focusKey > 0) {
      weightInputRef.current?.focus({
        preventScroll: true,
      });
    }
  }, [focusKey]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await onSubmit({
        weightKg: Number(weightKg),
        date: dateInputToIso(date),
        note,
      });

      if (!isEditing) {
        setWeightKg("");
        setDate(todayInputValue());
        setNote("");
      }
    } catch {
      // The parent hook surfaces the error message in the page.
    }
  };

  return (
    <form className="rounded-lg border border-white/10 bg-card/90 p-4 shadow-glow sm:p-5" onSubmit={handleSubmit}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-periwinkle">MoonWeight</p>
          <h2 className="text-xl font-semibold text-bone">{title}</h2>
        </div>
        {isEditing ? (
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/10 text-periwinkle transition hover:border-lavender/60 hover:text-bone"
            onClick={onCancelEdit}
            title="Cancel edit"
            aria-label="Cancel edit"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <label className="block text-sm font-medium text-bone" htmlFor="weightKg">
        Weight
      </label>
      <div className="mt-2 flex items-center rounded-lg border border-white/10 bg-night/65 px-3 shadow-insetline focus-within:border-lavender/70">
        <input
          id="weightKg"
          ref={weightInputRef}
          className="min-h-12 w-full bg-transparent text-2xl font-semibold text-bone outline-none placeholder:text-periwinkle/50"
          inputMode="decimal"
          min="0"
          step="0.1"
          type="number"
          value={weightKg}
          onChange={(event) => setWeightKg(event.target.value)}
          placeholder="72.4"
          required
        />
        <span className="text-sm font-medium text-periwinkle">kg</span>
      </div>

      <label className="mt-4 block text-sm font-medium text-bone" htmlFor="entryDate">
        Date
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-night/65 px-3 shadow-insetline focus-within:border-lavender/70">
        <CalendarDays className="h-4 w-4 text-lavender" />
        <input
          id="entryDate"
          className="min-h-12 w-full bg-transparent text-base text-bone outline-none [color-scheme:dark]"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </div>

      <label className="mt-4 block text-sm font-medium text-bone" htmlFor="note">
        Note
      </label>
      <textarea
        id="note"
        className="mt-2 min-h-24 w-full resize-y rounded-lg border border-white/10 bg-night/65 px-3 py-3 text-base text-bone outline-none shadow-insetline placeholder:text-periwinkle/50 focus:border-lavender/70"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={500}
        placeholder="Optional"
      />

      <button
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-violet px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-lavender hover:text-night disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={saving}
      >
        {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {saving ? "Saving" : isEditing ? "Save entry" : "Add entry"}
      </button>
    </form>
  );
};
