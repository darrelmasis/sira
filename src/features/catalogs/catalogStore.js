import { api } from "@/lib/api";
import { localDb } from "@/lib/local-db";

const catalogMap = [
  ["granjas", "farms"],
  ["galpones", "sheds"],
  ["lotes", "lots"],
  ["alojamientos", "placements"],
];

export async function refreshCatalogs(accessToken) {
  const entries = await Promise.all(
    catalogMap.map(async ([endpoint, table]) => {
      const response = await api(endpoint, {
        method: "GET",
        accessToken,
      });

      if (!response.success) {
        throw new Error(response.message || `No se pudo cargar ${endpoint}`);
      }

      return [table, response.data.map(normalizeCatalogRow)];
    }),
  );

  await localDb.transaction("rw", localDb.farms, localDb.sheds, localDb.lots, localDb.placements, async () => {
    for (const [table, rows] of entries) {
      await localDb[table].clear();
      if (rows.length > 0) {
        await localDb[table].bulkPut(rows);
      }
    }
  });

  await localDb.meta.put({
    key: "catalogsLastRefresh",
    value: new Date().toISOString(),
  });

  return getCatalogSummary();
}

export async function getCatalogSummary() {
  const [farms, sheds, lots, placements, lastRefresh] = await Promise.all([
    localDb.farms.count(),
    localDb.sheds.count(),
    localDb.lots.count(),
    localDb.placements.count(),
    localDb.meta.get("catalogsLastRefresh"),
  ]);

  return {
    farms,
    sheds,
    lots,
    placements,
    lastRefresh: lastRefresh?.value || null,
  };
}

export async function getLocalCatalogs() {
  const [farms, sheds, lots, placements] = await Promise.all([
    localDb.farms.orderBy("nombre").toArray(),
    localDb.sheds.orderBy("nombre").toArray(),
    localDb.lots.orderBy("codigo").toArray(),
    localDb.placements.orderBy("fechaAlojamiento").reverse().toArray(),
  ]);

  return { farms, sheds, lots, placements };
}

function normalizeCatalogRow(row) {
  return {
    ...row,
    id: String(row.id || row._id),
    _id: String(row._id || row.id),
    granjaId: row.granjaId ? String(row.granjaId) : row.granjaId,
    galponId: row.galponId ? String(row.galponId) : row.galponId,
    loteId: row.loteId ? String(row.loteId) : row.loteId,
  };
}
