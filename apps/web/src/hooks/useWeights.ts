import type {
  CreateWeightEntryInput,
  UpdateWeightEntryInput,
  WeightEntry,
  WeightStats,
} from "@moonweight/shared";
import { useCallback, useEffect, useState } from "react";

import { apiClient } from "../api/client";

export const useWeights = (enabled: boolean) => {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [stats, setStats] = useState<WeightStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setEntries([]);
      setStats(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextEntries, nextStats] = await Promise.all([apiClient.listWeights(), apiClient.getStats()]);
      setEntries(nextEntries);
      setStats(nextStats);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load weight entries");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createEntry = async (input: CreateWeightEntryInput) => {
    setSaving(true);
    setError(null);

    try {
      await apiClient.createWeight(input);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save weight entry");
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  const updateEntry = async (id: string, input: UpdateWeightEntryInput) => {
    setSaving(true);
    setError(null);

    try {
      await apiClient.updateWeight(id, input);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update weight entry");
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    setSaving(true);
    setError(null);

    try {
      await apiClient.deleteWeight(id);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete weight entry");
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  return {
    entries,
    stats,
    loading,
    saving,
    error,
    refresh,
    createEntry,
    updateEntry,
    deleteEntry,
  };
};
