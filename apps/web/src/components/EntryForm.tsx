import {
  createWeightEntryInputSchema,
  toDisplayWeight,
  toKilograms,
  type CreateWeightEntryInput,
  type WeightEntry,
  type WeightUnit,
} from "@moonweight/shared";
import { Plus, Save } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { todayInputValue } from "../lib/date";

type EntryFormProps = {
  editingEntry?: WeightEntry | null;
  focusKey?: number;
  saving: boolean;
  unit: WeightUnit;
  onSubmit: (input: CreateWeightEntryInput) => Promise<void>;
  onCancel?: () => void;
};
export const EntryForm = ({
  editingEntry,
  focusKey = 0,
  saving,
  unit,
  onSubmit,
  onCancel,
}: EntryFormProps) => {
  const initialWeight = editingEntry ? toDisplayWeight(editingEntry.weightKg, unit).toFixed(2) : "";
  const [weight, setWeight] = useState(initialWeight);
  const [date, setDate] = useState(editingEntry?.date ?? todayInputValue());
  const [note, setNote] = useState(editingEntry?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  useEffect(() => {
    if (focusKey > 0) inputRef.current?.focus({ preventScroll: true });
  }, [focusKey]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const weightKg =
      editingEntry && weight === initialWeight
        ? editingEntry.weightKg
        : toKilograms(Number(weight), unit);
    const parsed = createWeightEntryInputSchema.safeParse({ weightKg, date, note });
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      setErrors({ weight: fields.weightKg?.[0], date: fields.date?.[0], note: fields.note?.[0] });
      inputRef.current?.focus();
      return;
    }
    setErrors({});
    try {
      await onSubmit(parsed.data);
      if (!editingEntry) {
        setWeight("");
        setNote("");
        setDate(todayInputValue());
      }
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : "Unable to save. Please try again.",
      });
    }
  };
  return (
    <form className={editingEntry ? "entry-form" : "panel entry-form"} onSubmit={submit} noValidate>
      {!editingEntry && (
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR DAILY MOMENT</p>
            <h2>Record a reading</h2>
          </div>
          <span className="icon-disc">
            <Plus size={18} />
          </span>
        </div>
      )}
      <fieldset disabled={saving}>
        <label htmlFor={editingEntry ? "edit-weight" : "weight"}>
          Weight <span className="label-detail">{unit === "kg" ? "Kilograms" : "Pounds"}</span>
        </label>
        <div className="weight-input">
          <input
            ref={inputRef}
            id={editingEntry ? "edit-weight" : "weight"}
            type="number"
            inputMode="decimal"
            step="any"
            min="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0.0"
            autoFocus={Boolean(editingEntry)}
            data-dialog-focus={editingEntry ? "" : undefined}
            aria-invalid={Boolean(errors.weight)}
            aria-describedby={errors.weight ? `${fieldId}-weight-error` : undefined}
            required
          />
          <span>{unit}</span>
        </div>
        {errors.weight && (
          <p id={`${fieldId}-weight-error`} className="field-error">
            {errors.weight}
          </p>
        )}
        <label htmlFor={editingEntry ? "edit-date" : "entry-date"}>Date</label>
        <input
          id={editingEntry ? "edit-date" : "entry-date"}
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min="1900-01-01"
          max={todayInputValue()}
          required
          aria-invalid={Boolean(errors.date)}
          aria-describedby={errors.date ? `${fieldId}-date-error` : undefined}
        />
        {errors.date && (
          <p id={`${fieldId}-date-error`} className="field-error">
            {errors.date}
          </p>
        )}
        <label htmlFor={editingEntry ? "edit-note" : "note"}>
          Note <span className="label-detail">Optional</span>
        </label>
        <textarea
          id={editingEntry ? "edit-note" : "note"}
          className="input"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="Anything you’d like to remember."
          aria-invalid={Boolean(errors.note)}
          aria-describedby={`${fieldId}-note-count${errors.note ? ` ${fieldId}-note-error` : ""}`}
        />
        <p id={`${fieldId}-note-count`} className="character-count">
          {note.length} / 500
        </p>
        {errors.note && (
          <p id={`${fieldId}-note-error`} className="field-error">
            {errors.note}
          </p>
        )}
      </fieldset>
      {errors.submit && (
        <p className="notice notice-error" role="alert">
          {errors.submit}
        </p>
      )}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="button secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
        <button className="button primary" type="submit" disabled={saving}>
          {editingEntry ? <Save size={16} /> : <Plus size={17} />}
          {saving ? "Saving…" : editingEntry ? "Save changes" : "Add entry"}
        </button>
      </div>
      {!editingEntry && <p className="form-footnote">A small habit. A longer perspective.</p>}
    </form>
  );
};
