import type {
  AppSettings,
  AuthStatus,
  CreateWeightEntryInput,
  ImportResult,
  LoginInput,
  UpdateWeightEntryInput,
  WeightEntry,
} from "@moonweight/shared";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}
const request = async <T>(path: string, options: RequestInit = {}, csv = false): Promise<T> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(path, {
      ...options,
      signal: controller.signal,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: { fieldErrors?: Record<string, string[]> };
      };
      if (response.status === 401 && path !== "/api/auth/login")
        window.dispatchEvent(new Event("moonweight:unauthorized"));
      const detail = Object.values(payload.details?.fieldErrors ?? {}).flat()[0];
      throw new ApiRequestError(
        detail ?? payload.error ?? "The request could not be completed.",
        response.status,
      );
    }
    if (response.status === 204) return undefined as T;
    return (csv ? await response.text() : await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new Error(
      controller.signal.aborted
        ? "The request timed out. Please try again."
        : "Unable to connect. Check your connection and try again.",
    );
  } finally {
    window.clearTimeout(timeout);
  }
};
export const apiClient = {
  getAuthStatus: () => request<AuthStatus>("/api/auth/me"),
  login: (input: LoginInput) =>
    request<AuthStatus>("/api/auth/login", { method: "POST", body: JSON.stringify(input) }),
  logout: () => request<AuthStatus>("/api/auth/logout", { method: "POST" }),
  listWeights: () => request<WeightEntry[]>("/api/weights"),
  createWeight: (input: CreateWeightEntryInput) =>
    request<WeightEntry>("/api/weights", { method: "POST", body: JSON.stringify(input) }),
  updateWeight: (id: string, input: UpdateWeightEntryInput) =>
    request<WeightEntry>(`/api/weights/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteWeight: (id: string) => request<void>(`/api/weights/${id}`, { method: "DELETE" }),
  getSettings: () => request<AppSettings>("/api/settings"),
  saveSettings: (input: AppSettings) =>
    request<AppSettings>("/api/settings", { method: "PUT", body: JSON.stringify(input) }),
  exportCsv: () => request<string>("/api/weights/export", {}, true),
  importEntries: (entries: CreateWeightEntryInput[]) =>
    request<ImportResult>("/api/weights/import", {
      method: "POST",
      body: JSON.stringify({ entries }),
    }),
};
