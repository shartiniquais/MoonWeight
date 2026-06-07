import type {
  AuthStatus,
  CreateWeightEntryInput,
  LoginInput,
  UpdateWeightEntryInput,
  WeightEntry,
  WeightStats,
} from "@moonweight/shared";

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const request = async <T>(path: string, options: RequestInit = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;
    let message = fallback;

    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error ?? fallback;
    } catch {
      message = fallback;
    }

    throw new ApiRequestError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const apiClient = {
  getAuthStatus: () => request<AuthStatus>("/api/auth/me"),
  login: (input: LoginInput) =>
    request<AuthStatus>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  logout: () =>
    request<AuthStatus>("/api/auth/logout", {
      method: "POST",
    }),
  listWeights: () => request<WeightEntry[]>("/api/weights"),
  getStats: () => request<WeightStats>("/api/stats"),
  createWeight: (input: CreateWeightEntryInput) =>
    request<WeightEntry>("/api/weights", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateWeight: (id: string, input: UpdateWeightEntryInput) =>
    request<WeightEntry>(`/api/weights/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteWeight: (id: string) =>
    request<void>(`/api/weights/${id}`, {
      method: "DELETE",
    }),
};
