import {
  buildWeightStats,
  sortEntries,
  type AppSettings,
  type CreateWeightEntryInput,
  type UpdateWeightEntryInput,
  type WeightEntry,
} from "@moonweight/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../api/client";

export const useWeights = () => {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ unit: "kg", targetWeightKg: null });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const [nextEntries, nextSettings] = await Promise.all([
        apiClient.listWeights(),
        apiClient.getSettings(),
      ]);
      if (current !== generation.current) return;
      setEntries(sortEntries(nextEntries));
      setSettings(nextSettings);
      setLoaded(true);
    } catch (err) {
      if (current === generation.current)
        setError(err instanceof Error ? err.message : "Unable to load your tracker.");
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);
  const mutation = async <T>(action: () => Promise<T>, apply: (result: T) => void): Promise<T> => {
    ++generation.current; // A stale refresh must not overwrite a completed write.
    setLoading(false);
    setSaving(true);
    try {
      const result = await action();
      apply(result);
      setError(null);
      return result;
    } finally {
      setSaving(false);
    }
  };
  return {
    entries,
    settings,
    stats: useMemo(() => buildWeightStats(entries), [entries]),
    loading,
    loaded,
    saving,
    error,
    refresh,
    createEntry: (input: CreateWeightEntryInput) =>
      mutation(
        () => apiClient.createWeight(input),
        (entry) => setEntries((old) => sortEntries([entry, ...old])),
      ),
    updateEntry: (id: string, input: UpdateWeightEntryInput) =>
      mutation(
        () => apiClient.updateWeight(id, input),
        (entry) => setEntries((old) => sortEntries(old.map((e) => (e.id === id ? entry : e)))),
      ),
    deleteEntry: (id: string) =>
      mutation(
        () => apiClient.deleteWeight(id),
        () => setEntries((old) => old.filter((e) => e.id !== id)),
      ),
    saveSettings: (input: AppSettings) =>
      mutation(() => apiClient.saveSettings(input), setSettings),
    importEntries: (input: CreateWeightEntryInput[]) =>
      mutation(
        () => apiClient.importEntries(input),
        () => {
          void refresh();
        },
      ),
  };
};
