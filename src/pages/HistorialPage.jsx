import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  FormControl,
  Input,
  Label,
  Select,
  Textarea,
  DatePicker,
  FormDescription,
  Tooltip,
  toast,
} from "quickit-ui";
import { ClipboardList, Cloud, CloudOff, Egg, Eye, Mars, RefreshCw, Save, Skull, Venus } from "lucide-react";
import PageTable from "@/components/data/PageTable";
import FilterDrawer from "@/components/filters/FilterDrawer";
import ListEmptyState from "@/components/feedback/ListEmptyState";
import NumberStepper from "@/components/ui/NumberStepper";
import RowActionsDropdown from "@/components/ui/RowActionsDropdown";
import AppModal from "@/components/ui/AppModal";
import UserAvatar from "@/components/UserAvatar";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { usePermissions } from "@/features/auth/permissions";
import { getLocalCatalogs } from "@/features/catalogs/catalogStore";
import { getSyncQueue, updateRecordInQueue, removeRecordFromQueue } from "@/features/sync/syncQueue";
import { subscribeSync } from "@/features/sync/syncEngine";
import { useConfirmDialog } from "@/components/feedback/useConfirmDialog";
import { buildNameMap, normalizeId } from "@/lib/catalog-utils";
import { extractDateOnly, formatDateShort, formatDateInput, parseDateInput, formatDateTime, getAgeWeeks } from "@/lib/datetime";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";

const POLL_INTERVAL = 15_000;
const todayStr = () => extractDateOnly(new Date());

const syncStatusMeta = {
  pending: { label: "Pendiente", color: "warning" },
  syncing: { label: "Sincronizando", color: "info" },
  synced: { label: "Sincronizado", color: "success" },
  failed: { label: "Fallido", color: "danger" },
};

function getRecordEdad(record, catalogs) {
  const p = record.payload;
  if (p.edad != null && p.edad !== "" && Number.isFinite(Number(p.edad))) {
    return Number(p.edad);
  }

  const fecha = p.fecha;
  if (!fecha) return null;

  const lot = catalogs.lots.find((item) => normalizeId(item.id) === normalizeId(p.loteId));
  if (lot?.fechaAlojamiento) {
    return getAgeWeeks(lot.fechaAlojamiento, fecha);
  }

  const placement = (catalogs.placements || []).find(
    (item) =>
      normalizeId(item.loteId) === normalizeId(p.loteId) &&
      normalizeId(item.galponId) === normalizeId(p.galponId),
  );
  if (placement?.fechaAlojamiento) {
    return getAgeWeeks(placement.fechaAlojamiento, fecha);
  }

  const lotPlacements = (catalogs.placements || []).filter(
    (item) => normalizeId(item.loteId) === normalizeId(p.loteId),
  );
  if (lotPlacements.length) {
    const earliest = lotPlacements.reduce((min, item) => {
      const value = item.fechaAlojamiento;
      return !min || (value && value < min) ? value : min;
    }, null);
    if (earliest) return getAgeWeeks(earliest, fecha);
  }

  return null;
}

export default function HistorialPage() {
  const { accessToken, user: currentUser } = useAuth();
  const { filterCatalogs, filterRecords } = useFarmAccess();
  const { can } = usePermissions();
  const { confirm, ConfirmDialogHost } = useConfirmDialog();
  const [records, setRecords] = useState([]);
  const [catalogs, setCatalogs] = useState({ farms: [], sheds: [], lots: [], placements: [] });
  const [loading, setLoading] = useState(true);

  const canView = can("records.viewDetail");
  const canEdit = can("records.edit");
  const canDelete = can("records.delete");
  const hasActions = canView || canEdit || canDelete;

  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [datePreset, setDatePreset] = useState("all");
  const [farmFilter, setFarmFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [viewRecord, setViewRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  function normalizeServerRecord(row) {
    const auditName = row.audit?.updatedByName || row.audit?.createdByName || "";
    return {
      id: row.clientId || row.id,
      module: row.module || "mortalidad",
      syncStatus: "synced",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payload: {
        fecha: row.fecha,
        granjaId: row.granjaId,
        galponId: row.galponId,
        loteId: row.loteId,
        edad: row.edad,
        data: row.data || {},
        meta: row.meta || {},
        audit: {
          createdAt: row.audit?.clientCreatedAt || row.createdAt,
          updatedAt: row.audit?.clientUpdatedAt || row.updatedAt,
          updatedBy: {
            id: String(row.updatedBy || row.createdBy || ""),
            nombre: auditName,
            username: auditName,
            avatarId: row.audit?.updatedByAvatarId || null,
          },
        },
      },
    };
  }

  async function loadData(active) {
    const [nextRecords, nextCatalogs] = await Promise.all([getSyncQueue(), getLocalCatalogs()]);
    if (active !== undefined && !active()) return;

    let merged = filterRecords(nextRecords);

    if (can("records.view")) {
      try {
        const serverRes = await api("records", { method: "GET", accessToken });
        if (serverRes?.success && Array.isArray(serverRes.data)) {
          const localIds = new Set(nextRecords.map((r) => r.id));
          for (const row of serverRes.data) {
            const cid = row.clientId || row.id;
            if (!cid || localIds.has(cid)) continue;
            localIds.add(cid);
            merged.push(normalizeServerRecord(row));
          }
        }
      } catch {
      }
    }

    setRecords(merged.sort((a, b) => new Date(b.payload?.fecha || b.createdAt) - new Date(a.payload?.fecha || a.createdAt)));

    setCatalogs(filterCatalogs(nextCatalogs));
  }

  useEffect(() => {
    let active = true;

    loadData(() => active).finally(() => {
      if (active) setLoading(false);
    });

    const unsub = subscribeSync((event) => {
      if (event.type === "sync-complete" && active) {
        loadData(() => active);
      }
    });

    const interval = setInterval(() => {
      if (active) loadData(() => active);
    }, POLL_INTERVAL);

    return () => {
      active = false;
      unsub();
      clearInterval(interval);
    };
  }, [filterCatalogs, filterRecords]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (moduleFilter !== "all" && r.module !== moduleFilter) return false;
      if (dateRange.from && dateRange.to) {
        const d = extractDateOnly(r.payload.fecha);
        if (!d || d < extractDateOnly(dateRange.from) || d > extractDateOnly(dateRange.to)) return false;
      }
      if (farmFilter && normalizeId(r.payload.granjaId) !== normalizeId(farmFilter)) return false;
      return true;
    });
  }, [records, dateRange, farmFilter, moduleFilter]);

  const catalogMaps = useMemo(
    () => ({
      farms: buildNameMap(catalogs.farms),
      sheds: buildNameMap(catalogs.sheds),
      lots: buildNameMap(catalogs.lots, "codigo"),
    }),
    [catalogs],
  );

  function openViewDetail(record) {
    setViewRecord(record);
  }

  function openEdit(record) {
    const p = record.payload;
    const isProduccion = record.module === "produccion";
    setEditRecord(record);
    setEditForm({
      fecha: formatDateInput(p.fecha),
      granjaId: p.granjaId || "",
      galponId: p.galponId || "",
      loteId: p.loteId || "",
      ...(isProduccion
        ? {
            registros: p.data?.registros || [],
          }
        : {
            mortalidad: String(p.data?.mortalidad ?? "0"),
            sexo: p.data?.sexo || "macho",
            causaMuerte: p.data?.causaMuerte || "",
          }),
    });
    setEditError("");
    setEditSaving(false);
  }



  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!editForm || !editRecord) return;

    const isProduccion = editRecord.module === "produccion";

    if (!isProduccion) {
      const mortality = Number(editForm.mortalidad);
      if (mortality < 0) {
        setEditError("La mortalidad debe ser cero o mayor.");
        return;
      }
    }

    setEditSaving(true);
    setEditError("");

    const updatedPayload = {
      fecha: editForm.fecha,
      granjaId: editForm.granjaId.trim(),
      galponId: editForm.galponId.trim(),
      loteId: editForm.loteId.trim(),
      module: editRecord.module,
      ...(isProduccion
        ? {
            data: {
              ...editRecord.payload.data,
              registros: editForm.registros,
            },
          }
        : {
            data: {
              mortalidad: Number(editForm.mortalidad),
              sexo: editForm.sexo,
              causaMuerte: editForm.causaMuerte.trim(),
            },
          }),
    };

    try {
      let nextStatus = "pending";

      if (editRecord.syncStatus === "synced") {
        const body = {
          clientId: editRecord.id,
          ...updatedPayload,
          meta: editRecord.payload?.meta,
        };
        const response = await api("records", {
          method: "PUT",
          accessToken,
          body: JSON.stringify(body),
        });
        if (!response.success) throw new Error(response.message || "Error al actualizar");
        
        nextStatus = "synced";
      }

      await updateRecordInQueue(
        editRecord.id,
        {
          payload: updatedPayload,
          auditActor: null,
        },
        nextStatus
      );

      toast({ title: "Registro actualizado", kind: "success" });

      await loadData();
      setEditRecord(null);
      setEditForm(null);
    } catch (error) {
      setEditError(error.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(record) {
    const confirmed = await confirm({
      title: "Eliminar registro",
      description: "Esta acción no se puede deshacer. El registro se eliminará del servidor y del dispositivo.",
      confirmLabel: "Eliminar",
    });
    if (!confirmed) return;

    try {
      if (record.syncStatus === "synced") {
        const response = await api(`records?id=${record.id}`, {
          method: "DELETE",
          accessToken,
        });
        if (!response.success) throw new Error(response.message || "Error al eliminar");
      }

      await removeRecordFromQueue(record.id);

      toast({ title: "Registro eliminado", kind: "success" });

      await loadData();
    } catch (error) {
      toast({ title: error.message || "Error al eliminar", kind: "error" });
    }
  }

  const filteredSheds = useMemo(
    () => catalogs.sheds.filter((shed) => !editForm?.granjaId || normalizeId(shed.granjaId) === normalizeId(editForm.granjaId)),
    [catalogs.sheds, editForm?.granjaId],
  );

  const filteredLots = useMemo(
    () => catalogs.lots.filter((lot) => !editForm?.granjaId || normalizeId(lot.granjaId) === normalizeId(editForm.granjaId)),
    [catalogs.lots, editForm?.granjaId],
  );

  const columns = useMemo(() => {
    const isProduccion = moduleFilter === "produccion";

    const cols = [
      ...(moduleFilter === "all"
        ? [
            {
              key: "tipo",
              header: "Tipo",
              cellClassName: "w-10 whitespace-nowrap",
              render: (row) => (
                <Badge color={row.module === "produccion" ? "info" : "warning"} variant="soft" className="size-8 flex items-center justify-center p-0" aria-label={row.module === "produccion" ? "Producción" : "Mortalidad"}>
                  {row.module === "produccion" ? <Egg size={16} /> : <Skull size={16} />}
                </Badge>
              ),
            },
          ]
        : []),
      {
        key: "fecha",
        header: "Fecha",
        sortable: true,
        cellClassName: "min-w-20 whitespace-nowrap",
        render: (row) => formatDateShort(row.payload.fecha),
      },
      {
        key: "ubicacion",
        header: "Ubicación",
        cellClassName: "min-w-36 whitespace-normal",
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
        key: "edad",
        header: "Edad",
        sortable: true,
        align: "right",
        cellClassName: "min-w-16 whitespace-nowrap",
        render: (row) => {
          const edad = getRecordEdad(row, catalogs);
          return <span className="tabular-nums">{edad != null ? `${edad} sem` : "—"}</span>;
        },
      },
      ...(isProduccion
        ? [
            {
              key: "total",
              header: "Total",
              sortable: true,
              align: "right",
              cellClassName: "min-w-16 whitespace-nowrap",
              render: (row) => {
                const registros = row.payload.data?.registros || [];
                const total = registros.reduce((s, r) => s + Number(r.cantidad || 0), 0);
                return <span className="font-semibold tabular-nums">{total}</span>;
              },
            },
          ]
        : [
            {
              key: "mortalidad",
              header: "Mortalidad",
              sortable: true,
              align: "right",
              cellClassName: "min-w-16 whitespace-nowrap",
              render: (row) => (
                <span className="font-semibold tabular-nums">
                  {row.payload.data?.mortalidad ?? 0}
                </span>
              ),
            },
          ]),
      {
        key: "syncStatus",
        header: "Estado",
        cellClassName: "min-w-12 whitespace-nowrap",
        render: (row) => {
          if (row.syncStatus === "synced") {
            return <div className="flex justify-center"><Cloud className="text-emerald-500" size={18} aria-label="Sincronizado" /></div>;
          }
          if (row.syncStatus === "syncing") {
            return <div className="flex justify-center"><RefreshCw className="animate-spin text-sky-500" size={18} aria-label="Sincronizando" /></div>;
          }
          if (row.syncStatus === "failed") {
            return (
              <div className="flex items-center justify-center gap-1">
                <CloudOff className="text-red-500 shrink-0" size={18} aria-label="Fallido" />
                {row.syncError && (
                  <span className="text-xs text-red-500 max-w-40 truncate" title={row.syncError}>
                    {row.syncError}
                  </span>
                )}
              </div>
            );
          }
          return <div className="flex justify-center"><RefreshCw className="animate-spin text-zinc-400" size={18} aria-label="Pendiente" /></div>;
        },
      },
      {
        key: "updatedBy",
        header: "",
        sortable: true,
        cellClassName: "w-10",
        render: (row) => {
          const actor = row.payload.audit?.updatedBy;
          const name = actor?.nombre || actor?.username || "—";
          const isCurrentUser = actor && currentUser && String(actor.id) === String(currentUser._id || currentUser.id);
          const fecha = formatDateTime(row.payload.audit?.updatedAt || row.updatedAt);
          return (
            <Tooltip content={`${name} · ${fecha}`}>
              <div className="flex items-center justify-center">
                <UserAvatar
                  user={isCurrentUser ? { ...actor, avatarId: currentUser.avatarId } : actor}
                  nombre={name}
                  size="sm"
                />
              </div>
            </Tooltip>
          );
        },
      },
    ];

    if (hasActions) {
      cols.push({
        key: "actions",
        header: "",
        align: "right",
        render: (row) => (
          <RowActionsDropdown
            onView={canView ? () => openViewDetail(row) : undefined}
            onEdit={canEdit ? () => openEdit(row) : undefined}
            onDelete={canDelete ? () => handleDelete(row) : undefined}
          />
        ),
      });
    }

    return cols;
  }, [catalogMaps, catalogs, canView, canEdit, canDelete, hasActions, moduleFilter]);

  function updateEditField(field, value) {
    setEditForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "granjaId") {
        next.galponId = "";
        next.loteId = "";
      }
      return next;
    });
  }

  function setRange(preset) {
    setDatePreset(preset);
    if (preset === "today") {
      const d = new Date();
      setDateRange({ from: d, to: d });
    } else if (preset !== "range") {
      setDateRange({ from: null, to: null });
    }
  }

  return (
    <div className="space-y-4">
      <FilterDrawer
        datePreset={datePreset}
        onPresetChange={setRange}
        dateRange={dateRange}
        setDateRange={setDateRange}
        moduleFilter={moduleFilter}
        setModuleFilter={setModuleFilter}
        farmFilter={farmFilter}
        setFarmFilter={setFarmFilter}
        catalogs={catalogs}
        records={records}
        filteredRecords={filteredRecords}
      />

      {filteredRecords.length === 0 && !loading ? (
        <ListEmptyState
          icon={ClipboardList}
          title={records.length === 0 ? "Sin registros" : "Sin resultados"}
          description={
            records.length === 0
              ? "Aún no hay capturas de mortalidad. Crea el primer registro desde Mortalidad."
              : "No se encontraron registros con los filtros actuales. Intenta ajustar los filtros."
          }
        />
      ) : (
        <PageTable
          columns={columns}
          data={filteredRecords}
          rowKey={(row) => row.id}
          loading={loading}
          stickyHeader
          color="neutral"
          limit={25}
          skeletonRows={6}
        />
      )}

      <ConfirmDialogHost />

      <AppModal open={!!viewRecord} onOpenChange={(open) => { if (!open) setViewRecord(null); }}>
        <AppModal.Content>
          <AppModal.Layout>
            <AppModal.Header>
              <AppModal.Title>Detalle del registro</AppModal.Title>
              <FormDescription>Información completa del registro.</FormDescription>
            </AppModal.Header>

            <AppModal.Body className="space-y-4">
            {viewRecord && (() => {
              const p = viewRecord.payload;
              const isProduccion = viewRecord.module === "produccion";
              const farmId = normalizeId(p.granjaId);
              const shedId = normalizeId(p.galponId);
              const lotId = normalizeId(p.loteId);
              const farm = catalogMaps.farms[farmId] || farmId || "—";
              const shed = catalogMaps.sheds[shedId] || shedId || "—";
              const lot = catalogMaps.lots[lotId] || lotId || "—";
              const actor = p.audit?.updatedBy;
              const actorName = actor?.nombre || actor?.username || "—";
              const isCurrentUser = actor && currentUser && String(actor.id) === String(currentUser._id || currentUser.id);
              const meta = syncStatusMeta[viewRecord.syncStatus] || syncStatusMeta.pending;
              const edad = getRecordEdad(viewRecord, catalogs);

              return (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Fecha</Label>
                    <p className="text-sm">{formatDateShort(p.fecha)}</p>
                  </div>
                  <div>
                    <Label>Edad del lote</Label>
                    <p className="text-sm font-semibold tabular-nums">{edad != null ? `${edad} sem` : "—"}</p>
                  </div>
                  {isProduccion ? (
                    <>
                      <div className="md:col-span-2">
                        <Label>Ubicación</Label>
                        <p className="text-sm">{farm} · {shed} · Lote {lot}</p>
                      </div>
                      <div>
                        <Label>Raza</Label>
                        <p className="text-sm">{p.data?.raza || "—"}</p>
                      </div>
                      <div>
                        <Label>Estado de sincronización</Label>
                        <Badge color={meta.color} variant="soft">{meta.label}</Badge>
                      </div>
                      {p.data?.registros?.length > 0 && (
                        <div className="md:col-span-2">
                          <Label>Registros</Label>
                          <div className="mt-1 space-y-1">
                            {p.data.registros.map((r, i) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="capitalize">{r.categoria?.replace(/-/g, " ")}</span>
                                <span className="font-semibold tabular-nums">{r.cantidad}</span>
                              </div>
                            ))}
                            <div className="flex justify-between border-t border-zinc-200 pt-1 text-sm font-bold dark:border-zinc-700">
                              <span>Total</span>
                              <span className="tabular-nums">
                                {p.data.registros.reduce((s, r) => s + Number(r.cantidad || 0), 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <Label>Mortalidad</Label>
                        <p className="text-sm font-semibold tabular-nums">{p.data?.mortalidad ?? 0}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Ubicación</Label>
                        <p className="text-sm">{farm} · {shed} · Lote {lot}</p>
                      </div>
                      <div>
                        <Label>Sexo</Label>
                        {(() => {
                          const sexo = p.data?.sexo || "macho";
                          const Icon = sexo === "hembra" ? Venus : Mars;
                          return (
                            <p className="text-sm capitalize inline-flex items-center gap-1">
                              <Icon size={16} className={sexo === "hembra" ? "text-pink-500" : "text-sky-500"} />
                              {sexo === "hembra" ? "Hembra" : "Macho"}
                            </p>
                          );
                        })()}
                      </div>
                      <div>
                        <Label>Estado de sincronización</Label>
                        <Badge color={meta.color} variant="soft">{meta.label}</Badge>
                      </div>
                      {p.data?.causaMuerte && (
                        <div className="md:col-span-2">
                          <Label>Causa de muerte</Label>
                          <p className="text-sm whitespace-pre-wrap">{p.data.causaMuerte}</p>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <Label>Modificado Por</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <UserAvatar
                        user={isCurrentUser ? { ...actor, avatarId: currentUser.avatarId } : actor}
                        nombre={actorName}
                        size="sm"
                      />
                      <span className="text-sm">{actorName}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Última Modificación</Label>
                    <p className="text-sm">{formatDateTime(p.audit?.updatedAt || viewRecord.updatedAt)}</p>
                  </div>
                  <div>
                    <Label>Creado</Label>
                    <p className="text-sm">{formatDateTime(p.audit?.createdAt || viewRecord.createdAt)}</p>
                  </div>
                  {viewRecord.syncStatus === "failed" && viewRecord.syncError && (
                    <div className="md:col-span-2">
                      <Label>Error de Sincronización</Label>
                      <p className="text-sm text-danger-600">{viewRecord.syncError}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </AppModal.Body>

          <AppModal.Actions>
            <AppModal.Action type="button" variant="ghost" onClick={() => setViewRecord(null)}>
              Cerrar
            </AppModal.Action>
          </AppModal.Actions>
          </AppModal.Layout>
        </AppModal.Content>
      </AppModal>

      <AppModal open={!!editRecord} onOpenChange={(open) => { if (!open) { setEditRecord(null); setEditForm(null); } }}>
        <AppModal.Content>
          <AppModal.Form onSubmit={handleEditSubmit}>
            <AppModal.Header>
              <AppModal.Title>Editar registro</AppModal.Title>
              <FormDescription>Corrige los datos del registro.</FormDescription>
            </AppModal.Header>

            <AppModal.Body className="space-y-4">
              {editError && <Alert color="danger" title={editError} />}
              <div tabIndex={0} className="sr-only" />

              <div className="grid gap-4 md:grid-cols-2">
                <FormControl controlId="edit-fecha" required>
                  <Label>Fecha</Label>
                  <DatePicker
                    id="edit-fecha"
                    value={editForm ? parseDateInput(editForm.fecha) : null}
                    onChange={(date) => updateEditField("fecha", formatDateInput(date))}
                  />
                </FormControl>

                {editRecord?.module === "produccion" ? (
                  <FormControl controlId="edit-edad">
                    <Label>Edad del lote</Label>
                    <Input
                      id="edit-edad"
                      value={
                        editRecord && editForm
                          ? String(getRecordEdad(editRecord, catalogs) ?? "—")
                          : "—"
                      }
                      disabled
                    />
                  </FormControl>
                ) : (
                  <FormControl controlId="edit-mortalidad" required>
                    <Label>Cantidad de aves muertas</Label>
                    <NumberStepper
                      id="edit-mortalidad"
                      value={editForm?.mortalidad ?? "0"}
                      min={0}
                      onChange={(value) => updateEditField("mortalidad", value)}
                    />
                  </FormControl>
                )}

                <FormControl controlId="edit-granjaId" required>
                  <Label>Granja</Label>
                  {catalogs.farms.length > 0 ? (
                    <Select
                      id="edit-granjaId"
                      value={editForm?.granjaId || ""}
                      placeholder="Seleccionar granja"
                      onValueChange={(value) => updateEditField("granjaId", value)}
                    >
                      <option key="" value="">Seleccionar granja...</option>
                      {catalogs.farms.map((farm) => (
                        <option key={farm.id} value={farm.id}>{farm.nombre}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id="edit-granjaId"
                      placeholder="ID de granja"
                      value={editForm?.granjaId || ""}
                      onChange={(e) => updateEditField("granjaId", e.target.value)}
                    />
                  )}
                </FormControl>

                <FormControl controlId="edit-galponId" required>
                  <Label>Galpón</Label>
                  {filteredSheds.length > 0 ? (
                    <Select
                      id="edit-galponId"
                      value={editForm?.galponId || ""}
                      placeholder="Seleccionar galpón"
                      onValueChange={(value) => updateEditField("galponId", value)}
                    >
                      <option key="" value="">Seleccionar galpón...</option>
                      {filteredSheds.map((shed) => (
                        <option key={shed.id} value={shed.id}>{shed.nombre}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id="edit-galponId"
                      placeholder="ID de galpón"
                      value={editForm?.galponId || ""}
                      onChange={(e) => updateEditField("galponId", e.target.value)}
                    />
                  )}
                </FormControl>

                <FormControl controlId="edit-loteId" required>
                  <Label>Lote</Label>
                  {filteredLots.length > 0 ? (
                    <Select
                      id="edit-loteId"
                      value={editForm?.loteId || ""}
                      placeholder="Seleccionar lote"
                      onValueChange={(value) => updateEditField("loteId", value)}
                    >
                      <option key="" value="">Seleccionar lote...</option>
                      {filteredLots.map((lot) => (
                        <option key={lot.id} value={lot.id}>{lot.codigo}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id="edit-loteId"
                      placeholder="Código de lote"
                      value={editForm?.loteId || ""}
                      onChange={(e) => updateEditField("loteId", e.target.value)}
                    />
                  )}
                </FormControl>

                {editRecord?.module === "produccion" && editForm?.registros?.length > 0 && (
                  <div className="md:col-span-2">
                    <Label>Registros de Producción</Label>
                    <div className="mt-1 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
                      {editForm.registros.map((r, i) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                          <Label className="capitalize min-w-32 m-0">{r.categoria?.replace(/-/g, " ")}</Label>
                          <Input
                            type="number"
                            min={0}
                            value={r.cantidad}
                            onChange={(e) => {
                              const newRegs = [...editForm.registros];
                              newRegs[i] = { ...r, cantidad: Number(e.target.value) };
                              updateEditField("registros", newRegs);
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-zinc-200 pt-2 mt-2 text-sm font-bold dark:border-zinc-700">
                        <span>Total</span>
                        <span className="tabular-nums">
                          {editForm.registros.reduce((s, r) => s + Number(r.cantidad || 0), 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {editRecord?.module !== "produccion" && (
                  <FormControl controlId="edit-sexo">
                    <Label>Sexo</Label>
                    <Select
                      id="edit-sexo"
                      value={editForm?.sexo || "macho"}
                      placeholder="Seleccionar sexo"
                      onValueChange={(value) => updateEditField("sexo", value)}
                    >
                      <option value="macho">Macho</option>
                      <option value="hembra">Hembra</option>
                    </Select>
                  </FormControl>
                )}
              </div>

              {editRecord?.module !== "produccion" && (
                <>
                  <FormControl controlId="edit-causaMuerte">
                    <Label>Causa de muerte</Label>
                    <Select
                      id="edit-causaMuerte"
                      value={["Mortalidad natural", "Necropsia", "Ovoscopia", "Descarte", "Venta"].includes(editForm?.causaMuerte || "") ? editForm.causaMuerte : (editForm?.causaMuerte ? "Otro" : "")}
                      placeholder="Seleccionar causa..."
                      onValueChange={(val) => {
                        if (val === "Otro") {
                          updateEditField("causaMuerte", "Otro: ");
                        } else {
                          updateEditField("causaMuerte", val);
                        }
                      }}
                    >
                      <option value="">Seleccionar causa...</option>
                      <option value="Mortalidad natural">Mortalidad natural</option>
                      <option value="Necropsia">Necropsia</option>
                      <option value="Ovoscopia">Ovoscopia</option>
                      <option value="Descarte">Descarte</option>
                      <option value="Venta">Venta</option>
                      <option value="Otro">Otro (especificar)</option>
                    </Select>
                  </FormControl>

                  {editForm?.causaMuerte && (!["Mortalidad natural", "Necropsia", "Ovoscopia", "Descarte", "Venta", ""].includes(editForm.causaMuerte) || editForm.causaMuerte.startsWith("Otro: ")) && (
                    <FormControl controlId="edit-causaMuerteEspecificar">
                      <Label>Especificar causa</Label>
                      <Input
                        id="edit-causaMuerteEspecificar"
                        placeholder="Escribe la causa detallada aquí..."
                        value={editForm.causaMuerte.startsWith("Otro: ") ? editForm.causaMuerte.replace("Otro: ", "") : editForm.causaMuerte}
                        onChange={(e) => updateEditField("causaMuerte", `Otro: ${e.target.value}`)}
                      />
                    </FormControl>
                  )}
                </>
              )}
            </AppModal.Body>

            <AppModal.Actions>
              <Button type="button" variant="ghost" onClick={() => { setEditRecord(null); setEditForm(null); }}>
                Cancelar
              </Button>
              <Button type="submit" color="primary" loading={editSaving} loadingText="Guardando...">
                <Save aria-hidden="true" className="mr-2 size-4" />
                Guardar cambios
              </Button>
            </AppModal.Actions>
          </AppModal.Form>
        </AppModal.Content>
      </AppModal>
    </div>
  );
}
