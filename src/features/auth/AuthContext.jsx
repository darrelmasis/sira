import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { DEFAULT_PERMISSIONS, setPermissionsMap } from "./permissions";

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [permissionsMap, setPermissionsMapState] = useState(DEFAULT_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);

  const applyPermissions = useCallback((map) => {
    const next = map || DEFAULT_PERMISSIONS;
    setPermissionsMapState(next);
    setPermissionsMap(next);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const login = ({ user, accessToken, permissions }) => {
    setUser(user);
    setAccessToken(accessToken);
    if (permissions) applyPermissions(permissions);
  };

  const logout = async () => {
    try {
      await api("auth/logout", { method: "POST" });
    } catch (error) {
      console.error(error);
    }
    setUser(null);
    setAccessToken(null);
    applyPermissions(DEFAULT_PERMISSIONS);
  };

  const refreshSession = useCallback(async () => {
    try {
      const response = await api("auth/refresh", { method: "POST" });
      if (response.success) {
        setUser(response.data.user);
        setAccessToken(response.data.accessToken);
        if (response.data.permissions) applyPermissions(response.data.permissions);
        return response.data;
      }
    } catch (error) {
      console.error(error);
    }
    return null;
  }, [applyPermissions]);

  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      permissionsMap,
      login,
      logout,
      refreshSession,
      applyPermissions,
      updateUser,
      isAuthenticated: !!user,
      isLoading,
    }),
    [user, accessToken, permissionsMap, refreshSession, applyPermissions, updateUser, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
