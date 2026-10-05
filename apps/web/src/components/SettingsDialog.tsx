import {
  settingsInputSchema,
  toDisplayWeight,
  toKilograms,
  type AppSettings,
  type WeightUnit,
} from "@moonweight/shared";
import { useState, type FormEvent } from "react";
import { Dialog } from "./Dialog";

export const SettingsDialog = ({
  settings,
  saving,
  onSave,
  onClose,
}: {
  settings: AppSettings;
  saving: boolean;
  onSave: (input: AppSettings) => Promise<unknown>;
  onClose: () => void;
}) => {
  const [unit, setUnit] = useState<WeightUnit>(settings.unit);
  const initialTarget =
    settings.targetWeightKg === null
      ? ""
      : toDisplayWeight(settings.targetWeightKg, settings.unit).toFixed(2);
  const [target, setTarget] = useState(initialTarget);
  const [canonicalTarget, setCanonicalTarget] = useState(settings.targetWeightKg);
  const [error, setError] = useState<string | null>(null);
  const changeUnit = (next: WeightUnit) => {
    if (canonicalTarget !== null && Number.isFinite(canonicalTarget))
      setTarget(toDisplayWeight(canonicalTarget, next).toFixed(2));
    setUnit(next);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = settingsInputSchema.safeParse({ unit, targetWeightKg: canonicalTarget });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    try {
      await onSave(parsed.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    }
  };
  return (
    <Dialog title="Make it yours" busy={saving} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p className="muted dialog-intro">
          Choose how your readings appear. Your stored weights stay in kilograms.
        </p>
        <fieldset disabled={saving}>
          <legend>Display unit</legend>
          <div className="unit-options">
            {(["kg", "lb"] as const).map((value) => (
              <label key={value} className={unit === value ? "selected" : ""}>
                <input
                  type="radio"
                  name="unit"
                  value={value}
                  checked={unit === value}
                  onChange={() => changeUnit(value)}
                />
                {value === "kg" ? "Kilograms" : "Pounds"}
                <span>{value}</span>
              </label>
            ))}
          </div>
          <label htmlFor="target">
            Target weight <span className="label-detail">Optional · {unit}</span>
          </label>
          <input
            className="input"
            id="target"
            type="number"
            step="any"
            min="0.1"
            inputMode="decimal"
            placeholder="No target set"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setCanonicalTarget(
                e.target.value === "" ? null : toKilograms(Number(e.target.value), unit),
              );
            }}
            aria-describedby="target-help"
          />
          <p id="target-help" className="field-help">
            A reference line on your chart. Leave blank to remove it.
          </p>
        </fieldset>
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
