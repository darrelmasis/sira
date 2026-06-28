import { v4 as uuid } from "uuid";
import { localDb } from "@/lib/local-db";
import { api } from "@/lib/api";

const SYNCABLE_STATUSES = ["pending", "failed", "syncing"];

function buildAudit(user) {
  const now = new Date().toISOString();
  const actor = user
    ? {
        id: String(user.id || user._id),
        nombre: user.nombre || user.username,
        username: user.username,
        role: user.role,
        avatarId: user.avatarId || null,
      }
    : null;

  return {
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
    updatedBy: actor,
  };
}

export async function recoverInterruptedSync() {
  return localDb.syncQueue.where("syncStatus").equals("syncing").modify({
    syncStatus: "pending",
    updatedAt: new Date().toISOString(),
  });
}

export async function releaseSyncingRecords() {
  return recoverInterruptedSync();
}

export async function enqueueRecord(module, payload, user) {
  const audit = buildAudit(user);
  const record = {
    id: uuid(),
    module,
    payload: {
      ...payload,
      audit,
    },
    syncStatus: "pending",
    syncError: null,
    fecha: payload.fecha || null,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
  };

  await localDb.syncQueue.add(record);
  return record;
}

export async function getSyncQueue() {
  return localDb.syncQueue.orderBy("createdAt").reverse().toArray();
}

export async function getSyncSummary() {
  const [pending, syncing, synced, failed] = await Promise.all([
    localDb.syncQueue.where("syncStatus").equals("pending").count(),
    localDb.syncQueue.where("syncStatus").equals("syncing").count(),
    localDb.syncQueue.where("syncStatus").equals("synced").count(),
    localDb.syncQueue.where("syncStatus").equals("failed").count(),
  ]);

  return { pending, syncing, synced, failed, total: pending + syncing + synced + failed };
}

function buildSyncPayload(record) {
  const { audit, ...payloadWithoutAudit } = record.payload || {};

  return {
    clientId: record.id,
    module: record.module || record.payload?.module,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...payloadWithoutAudit,
    audit,
  };
}

async function markRecordsStatus(ids, syncStatus, syncError = null) {
  if (ids.length === 0) return;

  await localDb.syncQueue.where("id").anyOf(ids).modify({
    syncStatus,
    syncError,
    updatedAt: new Date().toISOString(),
  });
}

async function markFailedRecords(failedItems) {
  await Promise.all(
    failedItems
      .filter((item) => item?.clientId)
      .map((item) =>
        localDb.syncQueue.update(item.clientId, {
          syncStatus: "failed",
          syncError: item.message || "No se pudo sincronizar",
          updatedAt: new Date().toISOString(),
        }),
      ),
  );
}

export async function syncPendingRecords(accessToken) {
  if (!accessToken) {
    throw new Error("Sesión no disponible");
  }

  await releaseSyncingRecords();

  const pendingRecords = await localDb.syncQueue
    .where("syncStatus")
    .anyOf(SYNCABLE_STATUSES)
    .toArray();

  if (pendingRecords.length === 0) {
    return { synced: [], failed: [] };
  }

  const ids = pendingRecords.map((record) => record.id);

  await markRecordsStatus(ids, "syncing", null);

  let response;

  try {
    response = await api("sync", {
      method: "POST",
      accessToken,
      timeout: 45_000,
      body: JSON.stringify({
        records: pendingRecords.map(buildSyncPayload),
      }),
    });
  } catch (error) {
    await markRecordsStatus(ids, "failed", error.message || "Error de red");
    throw error;
  }

  if (!response?.success) {
    const message = response?.message || "No se pudo sincronizar";
    await markRecordsStatus(ids, "failed", message);
    throw new Error(message);
  }

  const synced = Array.isArray(response.data?.synced) ? response.data.synced : [];
  const failed = Array.isArray(response.data?.failed) ? response.data.failed : [];

  const syncedIds = synced.map((record) => record.clientId).filter(Boolean);
  const failedIds = failed.map((record) => record.clientId).filter(Boolean);

  await markRecordsStatus(syncedIds, "synced", null);
  await markFailedRecords(failed);

  const unresolvedIds = ids.filter((id) => !syncedIds.includes(id) && !failedIds.includes(id));
  if (unresolvedIds.length > 0) {
    await markRecordsStatus(unresolvedIds, "failed", "Respuesta incompleta del servidor");
  }

  return { synced, failed };
}

export async function clearFailedRecords() {
  return localDb.syncQueue.where("syncStatus").equals("failed").delete();
}

export async function hasPendingSync() {
  await releaseSyncingRecords();
  const count = await localDb.syncQueue.where("syncStatus").anyOf(SYNCABLE_STATUSES).count();
  return count > 0;
}

export async function retryFailedRecords() {
  return localDb.syncQueue.where("syncStatus").equals("failed").modify({
    syncStatus: "pending",
    syncError: null,
    updatedAt: new Date().toISOString(),
  });
}
