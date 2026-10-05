import { type CreateWeightEntryInput, type WeightEntry } from "@moonweight/shared";
import {
  Download,
  FileUp,
  LoaderCircle,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "./api/client";
import { Dialog } from "./components/Dialog";
import { EntryForm } from "./components/EntryForm";
import { HistoryList } from "./components/HistoryList";
import { ImportDialog } from "./components/ImportDialog";
import { LoginScreen } from "./components/LoginScreen";
import { SettingsDialog } from "./components/SettingsDialog";
import { StatsGrid } from "./components/StatsGrid";
import { WeightChart } from "./components/WeightChart";
import { useAuth } from "./hooks/useAuth";
import { useWeights } from "./hooks/useWeights";
import { formatEntryDate } from "./lib/date";
import { formatWeight } from "./lib/format";

const Tracker = ({ onLogout }: { onLogout: () => Promise<void> }) => {
  const {
    entries,
    stats,
    settings,
    loaded,
    loading,
    saving,
    error,
    refresh,
    createEntry,
    updateEntry,
    deleteEntry,
    saveSettings,
    importEntries,
  } = useWeights();
  const [editing, setEditing] = useState<WeightEntry | null>(null);
  const [deleting, setDeleting] = useState<WeightEntry | null>(null);
  const [dialog, setDialog] = useState<"settings" | "import" | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toolbarBusy, setToolbarBusy] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (notice && !notice.error) {
      const timer = window.setTimeout(() => setNotice(null), 5000);
      return () => window.clearTimeout(timer);
    }
  }, [notice]);
  const notify = (text: string) => setNotice({ text });
  const add = async (input: CreateWeightEntryInput) => {
    await createEntry(input);
    notify("Reading added. Your picture is up to date.");
  };
  const remove = async () => {
    if (!deleting) return;
    setDeleteError(null);
    try {
      await deleteEntry(deleting.id);
      setDeleting(null);
      notify("Entry deleted.");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Unable to delete. Please try again.");
    }
  };
  const toolbarAction = async (action: () => Promise<void>) => {
    setToolbarBusy(true);
    try {
      await action();
    } catch (err) {
      setNotice({
        text: err instanceof Error ? err.message : "Unable to complete the action.",
        error: true,
      });
    } finally {
      setToolbarBusy(false);
    }
  };
  const exportData = async () => {
    const csv = await apiClient.exportCsv();
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "moonweight.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("CSV exported in kilograms.");
  };
  const goToEntry = () => {
    formRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
    setFocusKey((key) => key + 1);
  };
  const disabled = saving || toolbarBusy || loading;
  const demo = entries.some((entry) => entry.note?.includes("[DEMO]"));
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/">
            <span className="brand-icon">
              <Moon size={21} />
            </span>
            MoonWeight<span className="version">01</span>
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            <a href="#overview">Overview</a>
            <a href="#history">History</a>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              type="button"
              aria-label="Preferences"
              title="Preferences"
              disabled={disabled || !loaded}
              onClick={() => setDialog("settings")}
            >
              <Settings2 size={19} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Sign out"
              title="Sign out"
              disabled={disabled}
              onClick={() => void toolbarAction(onLogout)}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="main-content">
        <section id="overview" className="overview-heading">
          <div>
            <p className="eyebrow">
              <span className="tiny-star">✦</span> A QUIET SPACE FOR YOUR DATA
            </p>
            <h1>
              Weight, <em>with perspective.</em>
            </h1>
            <p>One reading at a time. The bigger picture is yours.</p>
          </div>
          <div className="data-actions">
            <button
              className="button secondary"
              type="button"
              disabled={disabled || !loaded || !entries.length}
              onClick={() => void toolbarAction(exportData)}
            >
              <Download size={15} />
              Export CSV
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={disabled || !loaded}
              onClick={() => setDialog("import")}
            >
              <FileUp size={15} />
              Import
            </button>
            <button
              className="icon-button"
              type="button"
              title="Refresh readings"
              aria-label="Refresh readings"
              disabled={disabled}
              onClick={() => void refresh()}
            >
              <RefreshCw size={16} className={loading ? "spin" : ""} />
            </button>
          </div>
        </section>
        {demo && (
          <div className="demo-banner">
            <span className="demo-badge">DEMO</span>Fictional readings for a little perspective. No
            personal data.
          </div>
        )}
        {error && (
          <div className="notice notice-error" role="alert">
            {error}
            <button
              className="text-button"
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
            >
              Try again
            </button>
          </div>
        )}
        {!loaded ? (
          <div className="loading-panel" role="status">
            {loading ? (
              <>
                <LoaderCircle className="spin" size={25} />
                <h2>Finding your perspective…</h2>
                <p>Loading your readings and preferences.</p>
              </>
            ) : (
              <>
                <h2>Your tracker is temporarily unavailable.</h2>
                <p>Use “Try again” above to reconnect.</p>
              </>
            )}
          </div>
        ) : (
          <>
            <StatsGrid stats={stats} unit={settings.unit} />
            <div className="tracking-grid">
              <WeightChart entries={entries} settings={settings} />
              <aside>
                <div ref={formRef} className="entry-anchor">
                  <EntryForm
                    key={settings.unit}
                    unit={settings.unit}
                    focusKey={focusKey}
                    saving={saving || toolbarBusy}
                    onSubmit={add}
                  />
                </div>
                <div className="privacy-note">
                  <ShieldCheck size={17} />
                  <p>
                    Just your data.<span>Saved on your server, always in your hands.</span>
                  </p>
                </div>
              </aside>
            </div>
            <HistoryList
              entries={entries}
              saving={disabled}
              unit={settings.unit}
              onEdit={setEditing}
              onDelete={(entry) => {
                setDeleteError(null);
                setDeleting(entry);
              }}
            />
          </>
        )}
        <footer className="site-footer">
          <span>
            <Moon size={13} />
            MoonWeight
          </span>
          <span>Private by design. Made for the everyday.</span>
          <span>v1.0.0</span>
        </footer>
      </main>
      {loaded && (
        <button
          type="button"
          className="button primary mobile-add"
          onClick={goToEntry}
          disabled={disabled}
        >
          <Plus size={18} />
          Add reading
        </button>
      )}
      {notice && (
        <div
          className={`toast ${notice.error ? "toast-error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          <span>{notice.text}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            type="button"
            onClick={() => setNotice(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {editing && (
        <Dialog title="Edit your reading" onClose={() => setEditing(null)} busy={saving}>
          <EntryForm
            editingEntry={editing}
            unit={settings.unit}
            saving={saving}
            onCancel={() => setEditing(null)}
            onSubmit={async (input) => {
              await updateEntry(editing.id, { ...input, note: input.note ?? null });
              setEditing(null);
              notify("Entry updated.");
            }}
          />
        </Dialog>
      )}
      {deleting && (
        <Dialog title="Delete this reading?" onClose={() => setDeleting(null)} busy={saving}>
          <div className="delete-reading">
            <strong>{formatWeight(deleting.weightKg, settings.unit, 2)}</strong>
            <span>{formatEntryDate(deleting.date)}</span>
          </div>
          <p className="muted">This entry and its note will be permanently removed.</p>
          {deleteError && (
            <p role="alert" className="notice notice-error">
              {deleteError}
            </p>
          )}
          <div className="form-actions">
            <button
              className="button secondary"
              type="button"
              autoFocus
              data-dialog-focus=""
              onClick={() => setDeleting(null)}
              disabled={saving}
            >
              Keep entry
            </button>
            <button
              className="button destructive"
              type="button"
              onClick={() => void remove()}
              disabled={saving}
            >
              {saving ? "Deleting…" : "Delete entry"}
            </button>
          </div>
        </Dialog>
      )}
      {dialog === "settings" && (
        <SettingsDialog
          settings={settings}
          saving={saving}
          onClose={() => setDialog(null)}
          onSave={async (input) => {
            await saveSettings(input);
            notify("Preferences saved.");
          }}
        />
      )}
      {dialog === "import" && (
        <ImportDialog
          entries={entries}
          saving={saving}
          onClose={() => setDialog(null)}
          onImport={async (input) => {
            const result = await importEntries(input);
            notify(`${result.imported} entries imported; ${result.skipped} duplicates skipped.`);
            return result;
          }}
        />
      )}
    </div>
  );
};
export const App = () => {
  const { authenticated, checkingAuth, authError, login, logout } = useAuth();
  if (checkingAuth)
    return (
      <main className="session-loading" role="status">
        <Moon size={28} />
        <p>Opening your space…</p>
      </main>
    );
  return authenticated ? (
    <Tracker onLogout={logout} />
  ) : (
    <LoginScreen error={authError} onLogin={login} />
  );
};
