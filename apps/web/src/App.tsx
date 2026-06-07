import type { CreateWeightEntryInput, UpdateWeightEntryInput, WeightEntry } from "@moonweight/shared";
import { LogOut, Moon, Plus, RefreshCw, Shield } from "lucide-react";
import { useRef, useState } from "react";

import { EntryForm } from "./components/EntryForm";
import { HistoryList } from "./components/HistoryList";
import { LoginScreen } from "./components/LoginScreen";
import { StatsGrid } from "./components/StatsGrid";
import { WeightChart } from "./components/WeightChart";
import { useAuth } from "./hooks/useAuth";
import { useWeights } from "./hooks/useWeights";

export const App = () => {
  const { authenticated, checkingAuth, authError, login, logout } = useAuth();
  const { entries, stats, loading, saving, error, refresh, createEntry, updateEntry, deleteEntry } =
    useWeights(authenticated);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [formFocusKey, setFormFocusKey] = useState(0);
  const formSectionRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async (input: CreateWeightEntryInput | UpdateWeightEntryInput) => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, input);
      setEditingEntry(null);
      return;
    }

    await createEntry(input as CreateWeightEntryInput);
  };

  const moveToForm = () => {
    setFormFocusKey((key) => key + 1);
    window.requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleStartNewEntry = () => {
    setEditingEntry(null);
    moveToForm();
  };

  const handleEditEntry = (entry: WeightEntry) => {
    setEditingEntry(entry);
    moveToForm();
  };

  if (checkingAuth) {
    return (
      <main className="mystic-shell flex min-h-screen items-center justify-center px-4 text-bone">
        <div className="rounded-lg border border-white/10 bg-card/90 px-5 py-4 text-sm text-periwinkle shadow-glow">
          Checking session
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return <LoginScreen error={authError} onLogin={login} />;
  }

  return (
    <main className="mystic-shell min-h-screen text-bone">
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-3 sm:gap-5 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex flex-col gap-3 rounded-lg border border-white/10 bg-surface/80 p-3 shadow-insetline sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-lavender/30 bg-deep text-lavender shadow-glow sm:h-12 sm:w-12">
              <Moon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-bone sm:text-3xl">MoonWeight</h1>
              <p className="text-sm text-periwinkle">Private weight tracking for browser and mobile.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-night/60 px-3 text-sm text-periwinkle">
              <Shield className="h-4 w-4 text-success" />
              Local first access
            </span>
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-night/60 px-3 text-sm font-medium text-periwinkle transition hover:border-lavender/60 hover:text-bone disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-night/60 px-3 text-sm font-medium text-periwinkle transition hover:border-danger/50 hover:text-danger"
              type="button"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-bone">{error}</div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div ref={formSectionRef} className="scroll-mt-3 lg:sticky lg:top-5 lg:self-start">
            <EntryForm
              editingEntry={editingEntry}
              focusKey={formFocusKey}
              onCancelEdit={() => setEditingEntry(null)}
              onSubmit={handleSubmit}
              saving={saving}
            />
          </div>

          <div className="grid gap-5">
            <StatsGrid stats={stats} />
            <WeightChart entries={entries} />
          </div>
        </section>

        <HistoryList
          editingId={editingEntry?.id}
          entries={entries}
          onDelete={deleteEntry}
          onEdit={handleEditEntry}
          saving={saving}
        />
      </div>

      <button
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-20 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-violet px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-lavender hover:text-night sm:hidden"
        type="button"
        onClick={handleStartNewEntry}
      >
        <Plus className="h-4 w-4" />
        Add
      </button>
    </main>
  );
};
