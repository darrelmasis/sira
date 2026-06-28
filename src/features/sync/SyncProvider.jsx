import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "quickit-ui";
import { useOnlineStatus } from "@/lib/online";
import { useAuth } from "@/features/auth/AuthContext";
import { getSyncSummary, recoverInterruptedSync } from "./syncQueue";
import {
  configureSyncEngine,
  startAutoSync,
  stopAutoSync,
  subscribeSync,
  triggerManualSync,
  triggerOnlineSync,
  triggerSyncAfterSave,
} from "./syncEngine";

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const { accessToken, refreshSession } = useAuth();
  const isOnline = useOnlineStatus();
  const [summary, setSummary] = useState({ pending: 0, syncing: 0, synced: 0, failed: 0, total: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const refreshSummary = useCallback(async () => {
    const next = await getSyncSummary();
    setSummary(next);
    return next;
  }, []);

  useEffect(() => {
    configureSyncEngine({ accessToken, isOnline });
  }, [accessToken, isOnline]);

  useEffect(() => {
    async function bootstrapSummary() {
      await recoverInterruptedSync();
      await refreshSummary();
    }

    bootstrapSummary();
  }, [refreshSummary]);

  useEffect(() => {
    if (!accessToken || !isOnline) {
      stopAutoSync();
      return undefined;
    }

    startAutoSync();
    triggerOnlineSync().catch(() => {});
    refreshSummary();

    return () => stopAutoSync();
  }, [accessToken, isOnline, refreshSummary]);

  useEffect(() => {
    return subscribeSync((event) => {
      if (event.type === "sync-start") setIsSyncing(true);
      if (event.type === "sync-end") setIsSyncing(false);
      if (event.type === "sync-complete") {
        setSummary(event.summary);
        setLastSyncAt(new Date().toISOString());
      }
      if (event.type === "session-refresh-needed") {
        refreshSession().catch(() => {});
      }
      if (event.type === "sync-toast") {
        toast({ title: event.message, kind: event.kind === "success" ? "success" : "error" });
      }
    });
  }, [refreshSession]);

  const syncNow = useCallback(async () => {
    const result = await triggerManualSync();
    await refreshSummary();
    return result;
  }, [refreshSummary]);

  const syncAfterSave = useCallback(async () => {
    await triggerSyncAfterSave();
    await refreshSummary();
  }, [refreshSummary]);

  const value = useMemo(
    () => ({
      summary,
      isSyncing,
      isOnline,
      lastSyncAt,
      syncNow,
      syncAfterSave,
      refreshSummary,
    }),
    [summary, isSyncing, isOnline, lastSyncAt, syncNow, syncAfterSave, refreshSummary],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync debe usarse dentro de SyncProvider");
  }
  return context;
}
