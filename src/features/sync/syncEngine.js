import { syncPendingRecords, getSyncSummary, hasPendingSync, retryFailedRecords } from "./syncQueue";
import { refreshCatalogs } from "@/features/catalogs/catalogStore";

const SYNC_INTERVAL_MS = 30_000;
const listeners = new Set();

let accessTokenRef = null;
let isOnlineRef = true;
let syncingRef = false;
let intervalId = null;

function emit(event) {
  listeners.forEach((listener) => listener(event));
}

export function subscribeSync(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function configureSyncEngine({ accessToken, isOnline }) {
  accessTokenRef = accessToken;
  isOnlineRef = isOnline;
}

function firstFailureMessage(failed = []) {
  return failed.find((item) => item?.message)?.message || null;
}

export async function runSync(options = {}) {
  const { silent = false, refreshCatalogs: shouldRefresh = false } = options;

  if (!accessTokenRef || !isOnlineRef) {
    return null;
  }

  if (syncingRef) {
    return null;
  }

  const pending = await hasPendingSync();
  if (!pending && !shouldRefresh) {
    return null;
  }

  syncingRef = true;
  emit({ type: "sync-start" });

  let result = { synced: [], failed: [] };

  try {
    if (pending) {
      result = await syncPendingRecords(accessTokenRef);
    }

    if (shouldRefresh) {
      try {
        await refreshCatalogs(accessTokenRef);
        emit({ type: "session-refresh-needed" });
      } catch (catalogError) {
        if (!silent) {
          emit({
            type: "sync-toast",
            kind: "error",
            message: `Catálogos: ${catalogError.message || "no se pudieron actualizar"}`,
          });
        }
      }
    }

    const summary = await getSyncSummary();
    emit({ type: "sync-complete", result, summary });

    if (!silent && result.synced?.length > 0) {
      emit({
        type: "sync-toast",
        kind: "success",
        message: `${result.synced.length} registro(s) sincronizado(s)`,
      });
    }

    const failureMessage = firstFailureMessage(result.failed);
    if (!silent && result.failed?.length > 0) {
      emit({
        type: "sync-toast",
        kind: "error",
        message: failureMessage
          ? `${result.failed.length} registro(s) fallaron: ${failureMessage}`
          : `${result.failed.length} registro(s) fallaron`,
      });
    }

    return result;
  } catch (error) {
    emit({ type: "sync-error", error });
    if (!silent) {
      emit({
        type: "sync-toast",
        kind: "error",
        message: error.message || "Error de sincronización",
      });
    }
    throw error;
  } finally {
    syncingRef = false;
    emit({ type: "sync-end" });
  }
}

export function startAutoSync() {
  stopAutoSync();
  intervalId = setInterval(() => {
    runSync({ silent: true }).catch(() => {});
  }, SYNC_INTERVAL_MS);
}

export function stopAutoSync() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export async function triggerSyncAfterSave() {
  await retryFailedRecords();
  return runSync({ silent: false });
}

export async function triggerOnlineSync() {
  return runSync({ silent: true, refreshCatalogs: true });
}

export async function triggerManualSync() {
  await retryFailedRecords();
  return runSync({ silent: false, refreshCatalogs: true });
}
