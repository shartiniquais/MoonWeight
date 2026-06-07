import { useCallback, useEffect, useState } from "react";

import { apiClient, ApiRequestError } from "../api/client";

export const useAuth = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setCheckingAuth(true);
    setAuthError(null);

    try {
      const status = await apiClient.getAuthStatus();
      setAuthenticated(status.authenticated);
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
  }, [checkAuth]);

  const login = async (password: string) => {
    setAuthError(null);
    const status = await apiClient.login({ password });
    setAuthenticated(status.authenticated);
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
    login,
    logout,
  };
};
