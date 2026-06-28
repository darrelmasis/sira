import { useEffect, useMemo, useState } from "react";
import { Badge, DataTable, FormDescription } from "quickit-ui";
import UserAvatar from "@/components/UserAvatar";
import { ClipboardList } from "lucide-react";
import TableSkeleton from "@/components/feedback/TableSkeleton";
import ListEmptyState from "@/components/feedback/ListEmptyState";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { getLocalCatalogs } from "@/features/catalogs/catalogStore";
import { getSyncQueue } from "@/features/sync/syncQueue";
import { buildNameMap, normalizeId } from "@/lib/catalog-utils";
import { formatDateShort, formatDateTime } from "@/lib/datetime";

const syncStatusMeta = {
  pending: { label: "Pendiente", color: "warning" },
  syncing: { label: "Sincronizando", color: "info" },
  synced: { label: "Sincronizado", color: "success" },
  failed: { label: "Fallido", color: "danger" },
};

export default function HistorialPage() {
  const { filterCatalogs, filterRecords } = useFarmAccess();
  const [records, setRecords] = useState([]);
  const [catalogs, setCatalogs] = useState({ farms: [], sheds: [], lots: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([getSyncQueue(), getLocalCatalogs()])
      .then(([nextRecords, nextCatalogs]) => {
        if (!active) return;
        setRecords(filterRecords(nextRecords));
        setCatalogs(filterCatalogs(nextCatalogs));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filterCatalogs, filterRecords]);

  const catalogMaps = useMemo(
    () => ({
      farms: buildNameMap(catalogs.farms),
      sheds: buildNameMap(catalogs.sheds),
      lots: buildNameMap(catalogs.lots, "codigo"),
    }),
    [catalogs],
  );

  const columns = useMemo(
    () => [
      {
        key: "fecha",
        header: "Fecha",
        sortable: true,
        cellClassName: "min-w-28 whitespace-nowrap",
        render: (row) => formatDateShort(row.payload.fecha),
      },
      {
        key: "ubicacion",
        header: "Ubicación",
        cellClassName: "min-w-44 whitespace-normal",
        render: (row) => {
          const farmId = normalizeId(row.payload.granjaId);
          const shedId = normalizeId(row.payload.galponId);
          const lotId = normalizeId(row.payload.loteId);
          const farm = catalogMaps.farms[farmId] || farmId || "—";
          const shed = catalogMaps.sheds[shedId] || shedId || "—";
          const lot = catalogMaps.lots[lotId] || lotId || "—";
          return (
            <div>
              <div className="font-medium">{farm}</div>
              <div className="text-xs text-zinc-500">
                {shed} · Lote {lot}
              </div>
            </div>
          );
        },
      },
      {
        key: "mortalidad",
        header: "Mortalidad",
        sortable: true,
        align: "right",
        cellClassName: "min-w-24 whitespace-nowrap",
        render: (row) => (
          <span className="font-semibold tabular-nums">
            {row.payload.data?.mortalidad ?? 0}
          </span>
        ),
      },
      {
        key: "syncStatus",
        header: "Estado",
        cellClassName: "min-w-32 whitespace-normal",
        render: (row) => {
          const meta = syncStatusMeta[row.syncStatus] || syncStatusMeta.pending;
          return (
            <div className="space-y-1">
              <Badge color={meta.color} variant="soft">
                {meta.label}
              </Badge>
              {row.syncStatus === "failed" && row.syncError && (
                <FormDescription className="max-w-xs">
                  {row.syncError}
                </FormDescription>
              )}
            </div>
          );
        },
      },
      {
        key: "updatedBy",
        header: "Modificado por",
        cellClassName: "min-w-44 whitespace-normal",
        headerClassName: "min-w-44",
        render: (row) => {
          const actor = row.payload.audit?.updatedBy;
          const name = actor?.nombre || actor?.username || "—";
          return (
            <div className="flex items-center gap-2">
              <UserAvatar user={actor} nombre={name} size="sm" />
              <span className="text-sm">{name}</span>
            </div>
          );
        },
      },
      {
        key: "updatedAt",
        header: "Modificado",
        sortable: true,
        cellClassName: "min-w-40 whitespace-nowrap",
        render: (row) =>
          formatDateTime(row.payload.audit?.updatedAt || row.updatedAt),
      },
    ],
    [catalogMaps],
  );

  if (loading) {
    return <TableSkeleton columns={6} rows={6} showHeader />;
  }

  if (records.length === 0) {
    return (
      <ListEmptyState
        icon={ClipboardList}
        title="Sin registros"
        description="Aún no hay capturas de mortalidad. Crea el primer registro desde Mortalidad."
      />
    );
  }

  return (
    <div className="space-y-3">
      <FormDescription>
        {records.length} registro{records.length !== 1 ? "s" : ""} · incluye
        estado de sincronización y auditoría
      </FormDescription>
      <DataTable
        columns={columns}
        data={records}
        rowKey={(row) => row.id}
        stickyHeader
        color="neutral"
      />
    </div>
  );
}
