import { useCallback, useEffect, useState } from "react";
import type { SetupAccountInput } from "@moonweight/shared";

import { apiClient, ApiRequestError } from "../api/client";

export const useAuth = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setCheckingAuth(true);
    setAuthError(null);

    try {
      const status = await apiClient.getAuthStatus();
      setAuthenticated(status.authenticated);
      setSetupRequired(status.setupRequired ?? false);
    } catch (error) {
      setAuthenticated(false);

      if (!(error instanceof ApiRequestError && error.status === 401)) {
        setAuthError(error instanceof Error ? error.message : "Unable to check login status");
      }
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
    const expire = () => {
      setAuthenticated(false);
      setAuthError("Your session has ended. Please sign in again.");
    };
    window.addEventListener("moonweight:unauthorized", expire);
    return () => window.removeEventListener("moonweight:unauthorized", expire);
  }, [checkAuth]);

  const login = async (password: string, username?: string) => {
    setAuthError(null);
    const status = await apiClient.login({ password, username });
    setAuthenticated(status.authenticated);
    setSetupRequired(status.setupRequired ?? false);
  };
  const setupAccount = async (input: SetupAccountInput) => {
    setAuthError(null);
    try {
      const status = await apiClient.setupAccount(input);
      setAuthenticated(status.authenticated);
      setSetupRequired(status.setupRequired ?? false);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        await checkAuth();
        setAuthError("This tracker already has an account. Please sign in.");
      }
      throw error;
    }
  };

  const logout = async () => {
    setAuthError(null);
    await apiClient.logout();
    setAuthenticated(false);
  };

  return {
    authenticated,
    checkingAuth,
    authError,
    setupRequired,
    setupAccount,
    login,
    logout,
  };
};
