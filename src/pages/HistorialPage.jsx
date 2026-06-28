import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  FormControl,
  Input,
  Label,
  Modal,
  Select,
  Textarea,
  DatePicker,
  FormDescription,
  toast,
} from "quickit-ui";
import { ClipboardList, Eye, Save } from "lucide-react";
import NumberStepper from "@/components/NumberStepper";
import UserAvatar from "@/components/UserAvatar";
import TableSkeleton from "@/components/feedback/TableSkeleton";
import ListEmptyState from "@/components/feedback/ListEmptyState";
import RowActionsDropdown from "@/components/RowActionsDropdown";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { usePermissions } from "@/features/auth/permissions";
import { getLocalCatalogs } from "@/features/catalogs/catalogStore";
import { getSyncQueue, updateRecordInQueue, removeRecordFromQueue } from "@/features/sync/syncQueue";
import { subscribeSync } from "@/features/sync/syncEngine";
import { useConfirmDialog } from "@/components/feedback/useConfirmDialog";
import { buildNameMap, normalizeId } from "@/lib/catalog-utils";
import { formatDateShort, formatDateInput, parseDateInput, formatDateTime } from "@/lib/datetime";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";

const syncStatusMeta = {
  pending: { label: "Pendiente", color: "warning" },
  syncing: { label: "Sincronizando", color: "info" },
  synced: { label: "Sincronizado", color: "success" },
  failed: { label: "Fallido", color: "danger" },
};

export default function HistorialPage() {
  const { accessToken, user: currentUser } = useAuth();
  const { filterCatalogs, filterRecords } = useFarmAccess();
  const { can } = usePermissions();
  const { confirm, ConfirmDialogHost } = useConfirmDialog();
  const [records, setRecords] = useState([]);
  const [catalogs, setCatalogs] = useState({ farms: [], sheds: [], lots: [] });
  const [loading, setLoading] = useState(true);

  const canView = can("records.viewDetail");
  const canEdit = can("records.edit");
  const canDelete = can("records.delete");
  const hasActions = canView || canEdit || canDelete;

  const [viewRecord, setViewRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  function normalizeServerRecord(row) {
    const auditName = row.audit?.updatedByName || row.audit?.createdByName || "";
    return {
      id: row.clientId || row.id,
      module: "mortalidad",
      syncStatus: "synced",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payload: {
        fecha: row.fecha,
        granjaId: row.granjaId,
        galponId: row.galponId,
        loteId: row.loteId,
        data: {
          mortalidad: row.data?.mortalidad ?? 0,
          sexo: row.data?.sexo || "mixto",
          causaMuerte: row.data?.causaMuerte || "",
        },
        meta: row.meta || {},
        audit: {
          createdAt: row.audit?.clientCreatedAt || row.createdAt,
          updatedAt: row.audit?.clientUpdatedAt || row.updatedAt,
          updatedBy: {
            id: String(row.updatedBy || row.createdBy || ""),
            nombre: auditName,
            username: auditName,
            avatarId: null,
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

    return () => {
      active = false;
      unsub();
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

  function openViewDetail(record) {
    setViewRecord(record);
  }

  function openEdit(record) {
    const p = record.payload;
    setEditRecord(record);
    setEditForm({
      fecha: formatDateInput(p.fecha),
      granjaId: p.granjaId || "",
      galponId: p.galponId || "",
      loteId: p.loteId || "",
      mortalidad: String(p.data?.mortalidad ?? "0"),
      sexo: p.data?.sexo || "mixto",
      causaMuerte: p.data?.causaMuerte || "",
    });
    setEditError("");
    setEditSaving(false);
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!editForm || !editRecord) return;

    const mortality = Number(editForm.mortalidad);
    if (mortality < 0) {
      setEditError("La mortalidad debe ser cero o mayor.");
      return;
    }

    setEditSaving(true);
    setEditError("");

    const updatedPayload = {
      fecha: editForm.fecha,
      granjaId: editForm.granjaId.trim(),
      galponId: editForm.galponId.trim(),
      loteId: editForm.loteId.trim(),
      data: {
        mortalidad: mortality,
        sexo: editForm.sexo,
        causaMuerte: editForm.causaMuerte.trim(),
      },
    };

    try {
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
      }

      await updateRecordInQueue(editRecord.id, {
        payload: updatedPayload,
        auditActor: null,
      });

      toast({ title: "Registro actualizado", kind: "success" });

      const nextRecords = await getSyncQueue();
      setRecords(filterRecords(nextRecords));
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

      const nextRecords = await getSyncQueue();
      setRecords(filterRecords(nextRecords));
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
    const cols = [
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
          const isCurrentUser = actor && currentUser && String(actor.id) === String(currentUser._id || currentUser.id);
          return (
            <div className="flex items-center gap-2">
              <UserAvatar
                user={isCurrentUser ? { ...actor, avatarId: currentUser.avatarId } : actor}
                nombre={name}
                size="sm"
              />
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
  }, [catalogMaps, canView, canEdit, canDelete, hasActions]);

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

  if (loading) {
    return <TableSkeleton columns={columns} rows={6} />;
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
    <div className="space-y-4">
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

      <ConfirmDialogHost />

      <Modal open={!!viewRecord} onOpenChange={(open) => { if (!open) setViewRecord(null); }}>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>Detalle del registro</Modal.Title>
            <FormDescription>Información completa del registro de mortalidad.</FormDescription>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {viewRecord && (() => {
              const p = viewRecord.payload;
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

              return (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Fecha</Label>
                    <p className="text-sm">{formatDateShort(p.fecha)}</p>
                  </div>
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
                    <p className="text-sm capitalize">{p.data?.sexo || "mixto"}</p>
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
                  <div>
                    <Label>Modificado por</Label>
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
                    <Label>Última modificación</Label>
                    <p className="text-sm">{formatDateTime(p.audit?.updatedAt || viewRecord.updatedAt)}</p>
                  </div>
                  <div>
                    <Label>Creado</Label>
                    <p className="text-sm">{formatDateTime(p.audit?.createdAt || viewRecord.createdAt)}</p>
                  </div>
                  {viewRecord.syncStatus === "failed" && viewRecord.syncError && (
                    <div className="md:col-span-2">
                      <Label>Error de sincronización</Label>
                      <p className="text-sm text-danger-600">{viewRecord.syncError}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </Modal.Body>

          <Modal.Actions>
            <Modal.Action type="button" variant="ghost" onClick={() => setViewRecord(null)}>
              Cerrar
            </Modal.Action>
          </Modal.Actions>
        </Modal.Content>
      </Modal>

      <Modal open={!!editRecord} onOpenChange={(open) => { if (!open) { setEditRecord(null); setEditForm(null); } }}>
        <Modal.Content onOpenAutoFocus={(e) => e.preventDefault()}>
          <form onSubmit={handleEditSubmit}>
            <Modal.Header>
              <Modal.Title>Editar registro</Modal.Title>
              <FormDescription>Corrige los datos del registro de mortalidad.</FormDescription>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              {editError && <Alert color="danger" title={editError} />}

              <section className="grid gap-4 md:grid-cols-2">
                <FormControl controlId="edit-fecha" required>
                  <Label>Fecha</Label>
                  <DatePicker
                    id="edit-fecha"
                    value={editForm ? parseDateInput(editForm.fecha) : null}
                    onChange={(date) => updateEditField("fecha", formatDateInput(date))}
                  />
                </FormControl>

                <FormControl controlId="edit-mortalidad" required>
                  <Label>Cantidad de aves muertas</Label>
                  <NumberStepper
                    id="edit-mortalidad"
                    value={editForm?.mortalidad ?? "0"}
                    min={0}
                    onChange={(value) => updateEditField("mortalidad", value)}
                  />
                </FormControl>

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

                <FormControl controlId="edit-sexo">
                  <Label>Sexo</Label>
                  <Select
                    id="edit-sexo"
                    value={editForm?.sexo || "mixto"}
                    placeholder="Seleccionar sexo"
                    onValueChange={(value) => updateEditField("sexo", value)}
                  >
                    <option value="mixto">Mixto</option>
                    <option value="hembra">Hembra</option>
                    <option value="macho">Macho</option>
                  </Select>
                </FormControl>
              </section>

              <FormControl controlId="edit-causaMuerte">
                <Label>Causa de muerte</Label>
                <Textarea
                  id="edit-causaMuerte"
                  minRows={2}
                  placeholder="Ej. estrés calórico, problemas respiratorios..."
                  value={editForm?.causaMuerte || ""}
                  onChange={(e) => updateEditField("causaMuerte", e.target.value)}
                />
              </FormControl>
            </Modal.Body>

            <Modal.Actions>
              <Modal.Action type="button" variant="ghost" onClick={() => { setEditRecord(null); setEditForm(null); }}>
                Cancelar
              </Modal.Action>
              <Modal.Action type="submit" loading={editSaving} loadingText="Guardando...">
                <Save aria-hidden="true" className="size-4" />
                Guardar cambios
              </Modal.Action>
            </Modal.Actions>
          </form>
        </Modal.Content>
      </Modal>
    </div>
  );
}
