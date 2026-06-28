import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, FormControl, Input, Label, Select, toast, DatePicker } from "quickit-ui";
import { Save, Egg } from "lucide-react";
import FormSectionSkeleton from "@/components/feedback/FormSectionSkeleton";
import NumberStepper from "@/components/ui/NumberStepper";
import { useAuth } from "@/features/auth/AuthContext";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { usePermissions } from "@/features/auth/permissions";
import { getLocalCatalogs } from "@/features/catalogs/catalogStore";
import { enqueueRecord } from "@/features/sync/syncQueue";
import { useSync } from "@/features/sync/SyncProvider";
import { formatDateInput, parseDateInput, todayInput } from "@/lib/datetime";
import { normalizeId } from "@/lib/catalog-utils";
import { EGG_CATEGORIES, getCategoriasPorClasificacion } from "@/lib/egg-categories";

function buildInitialRegistros() {
  const map = {};
  for (const c of EGG_CATEGORIES) {
    map[c.id] = "0";
  }
  return map;
}

const initialForm = {
  fecha: todayInput(),
  granjaId: "",
  galponId: "",
  loteId: "",
};

export default function ProduccionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { validateRecordDate, dateConstraints, can } = usePermissions();
  const { filterCatalogs, hasAssignedFarms, canAccessFarm } = useFarmAccess();
  const { syncAfterSave, isOnline } = useSync();
  const [values, setValues] = useState(initialForm);
  const [registros, setRegistros] = useState(buildInitialRegistros);
  const [catalogs, setCatalogs] = useState({ farms: [], sheds: [], lots: [], placements: [] });
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedLot = useMemo(() => {
    if (!values.loteId) return null;
    return catalogs.lots.find((l) => normalizeId(l.id) === normalizeId(values.loteId)) || null;
  }, [catalogs.lots, values.loteId]);

  const selectedPlacement = useMemo(() => {
    if (!values.loteId || !values.galponId) return null;
    return catalogs.placements.find(
      (p) => normalizeId(p.loteId) === normalizeId(values.loteId) && normalizeId(p.galponId) === normalizeId(values.galponId),
    ) || null;
  }, [catalogs.placements, values.loteId, values.galponId]);

  const edad = useMemo(() => {
    if (!selectedPlacement || !values.fecha) return null;
    const aloj = new Date(selectedPlacement.fechaAlojamiento);
    const fecha = new Date(values.fecha);
    if (isNaN(aloj.getTime()) || isNaN(fecha.getTime())) return null;
    const diffMs = fecha.getTime() - aloj.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 0) return 0;
    return Math.floor(diffDays / 7);
  }, [selectedPlacement, values.fecha]);

  const raza = selectedLot?.raza || "";

  const filteredSheds = useMemo(
    () => catalogs.sheds.filter((shed) => !values.granjaId || normalizeId(shed.granjaId) === normalizeId(values.granjaId)),
    [catalogs.sheds, values.granjaId],
  );

  const filteredLots = useMemo(
    () => catalogs.lots.filter((lot) => !values.granjaId || normalizeId(lot.granjaId) === normalizeId(values.granjaId)),
    [catalogs.lots, values.granjaId],
  );

  const categoriasPorClasificacion = useMemo(getCategoriasPorClasificacion, []);

  const totales = useMemo(() => {
    const t = { incubable: 0, comercial: 0, descarte: 0 };
    let total = 0;
    for (const [clasif, cats] of Object.entries(categoriasPorClasificacion)) {
      for (const c of cats) {
        const val = Number(registros[c.id] || 0);
        t[clasif] += val;
        total += val;
      }
    }
    return { ...t, total };
  }, [registros, categoriasPorClasificacion]);

  useEffect(() => {
    let active = true;

    getLocalCatalogs()
      .then((nextCatalogs) => {
        if (!active) return;
        const scoped = filterCatalogs(nextCatalogs);
        setCatalogs(scoped);

        if (scoped.farms.length === 1) {
          setValues((current) => ({ ...current, granjaId: scoped.farms[0].id }));
        }
      })
      .finally(() => {
        if (active) setLoadingCatalogs(false);
      });

    return () => {
      active = false;
    };
  }, [filterCatalogs]);

  function updateField(field, value) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === "granjaId") {
        next.galponId = "";
        next.loteId = "";
      }
      return next;
    });
  }

  function updateRegistro(categoriaId, cantidad) {
    setRegistros((current) => ({ ...current, [categoriaId]: cantidad }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!can("records.create")) {
      setError("No tienes permiso para crear registros.");
      return;
    }

    if (!values.granjaId.trim()) { setError("La granja es obligatoria."); return; }
    if (!values.galponId.trim()) { setError("El galpón es obligatorio."); return; }
    if (!values.loteId.trim()) { setError("El lote es obligatorio."); return; }

    const dateError = validateRecordDate(values.fecha);
    if (dateError) { setError(dateError); return; }

    if (!canAccessFarm(values.granjaId)) {
      setError("No tienes acceso para registrar en esta granja.");
      return;
    }

    const registrosData = EGG_CATEGORIES
      .map((c) => ({ categoria: c.id, cantidad: Math.floor(Number(registros[c.id] || 0)) }))
      .filter((r) => r.cantidad > 0);

    if (registrosData.length === 0) {
      setError("Debes registrar al menos una categoría con cantidad mayor a cero.");
      return;
    }

    setSaving(true);
    try {
      await enqueueRecord(
        "produccion",
        {
          module: "produccion",
          fecha: values.fecha,
          granjaId: values.granjaId.trim(),
          galponId: values.galponId.trim(),
          loteId: values.loteId.trim(),
          etapa: "postura",
          edad: edad,
          data: {
            registros: registrosData,
            raza,
          },
          meta: { source: "local", offline: !isOnline },
        },
        user,
      );

      toast({
        title: isOnline ? "Registro guardado" : "Guardado sin conexión",
        kind: "success",
      });

      syncAfterSave().catch((error) => {
        console.error(error);
      });
      navigate("/historial");
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudo guardar el registro.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingCatalogs) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <FormSectionSkeleton fields={7} fullWidthLast />
        <div className="flex justify-end">
          <div className="h-10 w-36 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (!hasAssignedFarms) {
    return (
      <Alert
        color="warning"
        title="Sin granjas asignadas"
        description="Tu usuario no tiene granjas asignadas. Un desarrollador debe configurar tu acceso en el módulo de Usuarios."
      />
    );
  }

  if (catalogs.farms.length === 0 || catalogs.sheds.length === 0 || catalogs.lots.length === 0) {
    return (
      <Alert
        color="warning"
        title="Catálogos incompletos"
        description="Necesitas granjas, galpones y lotes cargados. Ve a Configuración del sistema → Actualizar catálogos o pide a un administrador que complete los catálogos."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-4">
      {error && <Alert color="danger" title={error} />}

      {!can("records.editAnyDate") && (
        <Alert
          color="info"
          title="Fecha restringida"
          description="Como operario solo puedes registrar actividades del día de hoy."
        />
      )}

      <section className="grid gap-4 rounded-xl border border-zinc-200/80 p-5 dark:border-zinc-800 md:grid-cols-3">
        <FormControl controlId="granjaId" required>
          <Label>Granja</Label>
          {catalogs.farms.length > 0 ? (
            <Select id="granjaId" value={values.granjaId} placeholder="Seleccionar granja" onValueChange={(value) => updateField("granjaId", value)}>
              <option value="">Seleccionar granja...</option>
              {catalogs.farms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.nombre}</option>
              ))}
            </Select>
          ) : (
            <Input id="granjaId" placeholder="ID de granja" value={values.granjaId} onChange={(event) => updateField("granjaId", event.target.value)} />
          )}
        </FormControl>

        <FormControl controlId="galponId" required>
          <Label>Galpón</Label>
          {filteredSheds.length > 0 ? (
            <Select id="galponId" value={values.galponId} placeholder="Seleccionar galpón" onValueChange={(value) => updateField("galponId", value)}>
              <option value="">Seleccionar galpón...</option>
              {filteredSheds.map((shed) => (
                <option key={shed.id} value={shed.id}>{shed.nombre}</option>
              ))}
            </Select>
          ) : (
            <Input id="galponId" placeholder="ID de galpón" value={values.galponId} onChange={(event) => updateField("galponId", event.target.value)} />
          )}
        </FormControl>

        <FormControl controlId="loteId" required>
          <Label>Lote</Label>
          {filteredLots.length > 0 ? (
            <Select id="loteId" value={values.loteId} placeholder="Seleccionar lote" onValueChange={(value) => updateField("loteId", value)}>
              <option value="">Seleccionar lote...</option>
              {filteredLots.map((lot) => (
                <option key={lot.id} value={lot.id}>{lot.codigo}</option>
              ))}
            </Select>
          ) : (
            <Input id="loteId" placeholder="Código de lote" value={values.loteId} onChange={(event) => updateField("loteId", event.target.value)} />
          )}
        </FormControl>

        <FormControl controlId="fecha" required>
          <Label>Fecha</Label>
          <DatePicker
            id="fecha"
            value={parseDateInput(values.fecha)}
            placeholder="Seleccionar fecha del registro"
            minDate={dateConstraints.minDate}
            maxDate={dateConstraints.maxDate}
            onChange={(date) => updateField("fecha", formatDateInput(date))}
          />
        </FormControl>

        <FormControl controlId="edad">
          <Label>Edad (semanas)</Label>
          <Input id="edad" value={edad !== null ? String(edad) : "—"} disabled />
        </FormControl>

        <FormControl controlId="raza">
          <Label>Raza</Label>
          <Input id="raza" value={raza || "—"} disabled />
        </FormControl>
      </section>

      <section className="rounded-xl border border-zinc-200/80 p-4 dark:border-zinc-800 space-y-5">
        <div className="flex items-center gap-2">
          <Egg aria-hidden="true" className="size-5 text-brand-500" />
          <h2 className="text-base font-semibold">Registro de producción</h2>
        </div>

        {Object.entries(categoriasPorClasificacion).map(([clasif, cats]) => (
          <div key={clasif}>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-1">{clasif}</h3>
            <div className="flex flex-col gap-2">
              {cats.map((c) => (
                <div key={c.id} className="flex items-center gap-3 min-w-0">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 w-36 shrink-0 leading-tight">{c.nombre}</span>
                  <div className="flex-1 max-w-56">
                    <NumberStepper
                      value={registros[c.id]}
                      min={0}
                      onChange={(value) => updateRegistro(c.id, value)}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/80 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="font-semibold text-brand-600">I: {totales.incubable}</span>
          <span className="font-semibold text-sky-600">C: {totales.comercial}</span>
          <span className="font-semibold text-zinc-500">D: {totales.descarte}</span>
          <span className="font-bold">Total: {totales.total}</span>
        </div>
        <Button type="submit" color="brand" loading={saving} loadingText="Guardando..." className="w-full sm:w-auto">
          <Save aria-hidden="true" className="size-4" />
          Guardar producción
        </Button>
      </div>
    </form>
  );
}
