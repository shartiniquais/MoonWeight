import {
  previewCsv,
  type CsvPreviewRow,
  type CreateWeightEntryInput,
  type ImportResult,
  type WeightEntry,
} from "@moonweight/shared";
import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { Dialog } from "./Dialog";

export const ImportDialog = ({
  entries,
  saving,
  onImport,
  onClose,
}: {
  entries: WeightEntry[];
  saving: boolean;
  onImport: (input: CreateWeightEntryInput[]) => Promise<ImportResult>;
  onClose: () => void;
}) => {
  const [rows, setRows] = useState<CsvPreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const sequence = useRef(0);
  const accepted = rows.filter((row) => row.input && !row.duplicate && !row.error);
  const rejected = rows.filter((row) => row.error);
  const duplicates = rows.filter((row) => row.duplicate);
  const readFile = async (file?: File) => {
    const current = ++sequence.current;
    setError(null);
    setRows([]);
    setFileName(file?.name ?? "");
    if (!file) return;
    if (file.size > 1_048_576) {
      setError("CSV must be 1 MB or smaller.");
      return;
    }
    setReading(true);
    try {
      const text = await file.text();
      if (current === sequence.current) setRows(previewCsv(text, entries));
    } catch (err) {
      if (current === sequence.current)
        setError(err instanceof Error ? err.message : "Unable to read that file.");
    } finally {
      if (current === sequence.current) setReading(false);
    }
  };
  const submit = async () => {
    setError(null);
    try {
      await onImport(accepted.map((row) => row.input!));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed. No rows were saved.");
    }
  };
  return (
    <Dialog title="Bring your history along" onClose={onClose} busy={saving || reading} wide>
      <p className="muted dialog-intro">
        Import up to 1,000 readings. Preview first; existing entries are never overwritten.
      </p>
      <label className="file-picker" htmlFor="csv-file">
        <FileUp size={24} />
        <strong>{fileName || "Choose a CSV file"}</strong>
        <span>Up to 1 MB · kilograms only</span>
      </label>
      <input
        id="csv-file"
        type="file"
        accept=".csv,text/csv"
        className="file-input"
        disabled={saving || reading}
        onChange={(e) => void readFile(e.target.files?.[0])}
      />
      <p className="csv-format">
        Header: <code>date,weight_kg,note</code>
        <br />
        Dates: <code>YYYY-MM-DD</code> · Notes with commas must be quoted.
      </p>
      {reading && (
        <p role="status" className="muted">
          Reading your file…
        </p>
      )}
      {!!rows.length && (
        <>
          <div className="import-summary" role="status">
            <span>
              <strong>{accepted.length}</strong> ready
            </span>
            <span>
              <strong>{duplicates.length}</strong> duplicates skipped
            </span>
            <span>
              <strong>{rejected.length}</strong> rejected
            </span>
          </div>
          <div className="import-preview">
            <table>
              <caption className="sr-only">CSV import preview</caption>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Date / weight</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.row}>
                    <td>{row.row}</td>
                    <td>
                      {row.input ? (
                        <>
                          {row.input.date}
                          <br />
                          {row.input.weightKg} kg
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={row.error ? "field-error" : ""}>
                      {row.error || (row.duplicate ? "Duplicate · skipped" : "Ready to import")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!!rejected.length && (
            <p className="field-help">
              Rejected rows will not be imported. Correct them in your file and preview again, or
              import only the ready rows below.
            </p>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          className="button secondary"
          type="button"
          disabled={saving || reading}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="button primary"
          type="button"
          disabled={!accepted.length || saving || reading}
          onClick={() => void submit()}
        >
          {saving
            ? "Importing…"
            : `Import ${accepted.length} ready ${accepted.length === 1 ? "entry" : "entries"}`}
        </button>
      </div>
    </Dialog>
  );
};
