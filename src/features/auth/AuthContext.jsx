import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { DEFAULT_PERMISSIONS, setPermissionsMap } from "./permissions";

const SESSION_CACHE_KEY = "sira_session";

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}

function cacheSession(user, permissions) {
  try {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ user, permissions }));
  } catch {}
}

function loadCachedSession() {
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearCachedSession() {
  try {
    localStorage.removeItem(SESSION_CACHE_KEY);
  } catch {}
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
    setUser((current) => {
      const next = current ? { ...current, ...patch } : current;
      if (next) cacheSession(next, null);
      return next;
    });
  }, []);

  const login = ({ user, accessToken, permissions }) => {
    setUser(user);
    setAccessToken(accessToken);
    if (permissions) applyPermissions(permissions);
    cacheSession(user, permissions);
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
    clearCachedSession();
  };

  const refreshSession = useCallback(async () => {
    try {
      const response = await api("auth/refresh", { method: "POST" });
      if (response.success) {
        setUser(response.data.user);
        setAccessToken(response.data.accessToken);
        if (response.data.permissions) applyPermissions(response.data.permissions);
        cacheSession(response.data.user, response.data.permissions);
        return response.data;
      }
    } catch (error) {
      console.error(error);
    }
    return null;
  }, [applyPermissions]);

  useEffect(() => {
    (async () => {
      const result = await refreshSession();
      if (!result) {
        const cached = loadCachedSession();
        if (cached) {
          setUser(cached.user);
          if (cached.permissions) applyPermissions(cached.permissions);
        }
      }
      setIsLoading(false);
    })();
  }, [refreshSession, applyPermissions]);

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
