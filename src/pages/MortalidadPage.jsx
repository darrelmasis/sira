import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, FormControl, Input, Label, Select, Textarea, toast, DatePicker } from "quickit-ui";
import { RefreshCcw, Save } from "lucide-react";
import NumberStepper from "@/components/NumberStepper";
import FormSectionSkeleton from "@/components/feedback/FormSectionSkeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { usePermissions } from "@/features/auth/permissions";
import { getLocalCatalogs, refreshCatalogs } from "@/features/catalogs/catalogStore";
import { enqueueRecord } from "@/features/sync/syncQueue";
import { useSync } from "@/features/sync/SyncProvider";
import { subscribeSync } from "@/features/sync/syncEngine";
import { formatDateInput, parseDateInput, todayInput } from "@/lib/datetime";
import { normalizeId } from "@/lib/catalog-utils";

const initialForm = {
  fecha: todayInput(),
  granjaId: "",
  galponId: "",
  loteId: "",
  mortalidad: "0",
  sexo: "mixto",
  causaMuerte: "",
};

function validateMortalidad(values, validateRecordDate) {
  const dateError = validateRecordDate(values.fecha);
  if (dateError) return dateError;
  if (!values.granjaId.trim()) return "La granja es obligatoria.";
  if (!values.galponId.trim()) return "El galpón es obligatorio.";
  if (!values.loteId.trim()) return "El lote es obligatorio.";
  if (values.mortalidad === "" || Number(values.mortalidad) < 0) return "La mortalidad debe ser cero o mayor.";
  return "";
}

function validateCatalogRefs(values, catalogs) {
  const farm = catalogs.farms.find((item) => normalizeId(item.id) === normalizeId(values.granjaId));
  if (!farm) return "La granja seleccionada no está disponible. Actualiza catálogos en Configuración del sistema.";

  const shed = catalogs.sheds.find((item) => normalizeId(item.id) === normalizeId(values.galponId));
  if (!shed) return "El galpón seleccionado no está disponible. Actualiza catálogos en Configuración del sistema.";

  const lot = catalogs.lots.find((item) => normalizeId(item.id) === normalizeId(values.loteId));
  if (!lot) return "El lote seleccionado no está disponible. Actualiza catálogos en Configuración del sistema.";

  return "";
}

export default function MortalidadPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { validateRecordDate, dateConstraints, can } = usePermissions();
  const { filterCatalogs, hasAssignedFarms, canAccessFarm } = useFarmAccess();
  const { syncAfterSave, syncNow, isSyncing, isOnline } = useSync();
  const [values, setValues] = useState(initialForm);
  const [catalogs, setCatalogs] = useState({ farms: [], sheds: [], lots: [] });
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [downloadingCatalogs, setDownloadingCatalogs] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const serverAttempted = useRef(false);

  const filteredSheds = useMemo(
    () => catalogs.sheds.filter((shed) => !values.granjaId || normalizeId(shed.granjaId) === normalizeId(values.granjaId)),
    [catalogs.sheds, values.granjaId],
  );

  const filteredLots = useMemo(
    () => catalogs.lots.filter((lot) => !values.granjaId || normalizeId(lot.granjaId) === normalizeId(values.granjaId)),
    [catalogs.lots, values.granjaId],
  );

  const loadCatalogs = useCallback(async () => {
    const nextCatalogs = await getLocalCatalogs();
    const scoped = filterCatalogs(nextCatalogs);
    setCatalogs(scoped);

    if (scoped.farms.length === 1) {
      setValues((current) => ({ ...current, granjaId: scoped.farms[0].id }));
    }

    return scoped;
  }, [filterCatalogs]);

  const fetchFromServer = useCallback(async () => {
    if (!accessToken || serverAttempted.current) return;
    serverAttempted.current = true;
    setDownloadingCatalogs(true);
    try {
      await refreshCatalogs(accessToken);
      await loadCatalogs();
    } catch (err) {
      console.error("Error al descargar catálogos:", err);
    } finally {
      setDownloadingCatalogs(false);
    }
  }, [accessToken, loadCatalogs]);

  useEffect(() => {
    let active = true;

    (async () => {
      const scoped = await loadCatalogs();
      if (active && hasAssignedFarms && (scoped.farms.length === 0 || scoped.sheds.length === 0 || scoped.lots.length === 0)) {
        fetchFromServer();
      }
      if (active) setLoadingCatalogs(false);
    })();

    const unsub = subscribeSync((event) => {
      if (event.type === "sync-complete" && active) {
        loadCatalogs();
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, [loadCatalogs, fetchFromServer, hasAssignedFarms]);

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

  async function handleSubmit(event) {
    event.preventDefault();
    if (!can("records.create")) {
      setError("No tienes permiso para crear registros.");
      return;
    }

    const validationError = validateMortalidad(values, validateRecordDate);
    setError(validationError);
    if (validationError) return;

    const catalogError = validateCatalogRefs(values, catalogs);
    if (catalogError) {
      setError(catalogError);
      return;
    }

    if (!canAccessFarm(values.granjaId)) {
      setError("No tienes acceso para registrar en esta granja.");
      return;
    }

    setSaving(true);
    try {
      await enqueueRecord(
        "mortalidad",
        {
          module: "mortalidad",
          fecha: values.fecha,
          granjaId: values.granjaId.trim(),
          galponId: values.galponId.trim(),
          loteId: values.loteId.trim(),
          etapa: null,
          edad: null,
          data: {
            mortalidad: Number(values.mortalidad),
            sexo: values.sexo,
            causaMuerte: values.causaMuerte.trim(),
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
    if (downloadingCatalogs) {
      return (
        <div className="mx-auto max-w-3xl space-y-4">
          <FormSectionSkeleton fields={7} fullWidthLast />
          <div className="flex justify-end">
            <div className="h-10 w-36 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      );
    }

    return (
      <Alert
        color="warning"
        title="Catálogos incompletos"
        description={
          <div className="space-y-3">
            <p>Necesitas granjas, galpones y lotes cargados. Si es tu primer inicio, presiona "Sincronizar ahora" para descargarlos del servidor.</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              color="neutral"
              loading={isSyncing}
              onClick={syncNow}
            >
              <RefreshCcw aria-hidden="true" className="size-3.5" />
              Sincronizar ahora
            </Button>
          </div>
        }
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

      <section className="grid gap-4 rounded-xl border border-zinc-200/80 p-5 dark:border-zinc-800 md:grid-cols-2">
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

        <FormControl controlId="mortalidad" required>
          <Label>Cantidad de aves muertas</Label>
          <NumberStepper
            id="mortalidad"
            value={values.mortalidad}
            min={0}
            onChange={(value) => updateField("mortalidad", value)}
          />
        </FormControl>

        <FormControl controlId="granjaId" required>
          <Label>Granja</Label>
          {catalogs.farms.length > 0 ? (
            <Select id="granjaId" value={values.granjaId} placeholder="Seleccionar granja" onValueChange={(value) => updateField("granjaId", value)}>
              <option value="">Seleccionar granja...</option>
              {catalogs.farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.nombre}
                </option>
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
                <option key={shed.id} value={shed.id}>
                  {shed.nombre}
                </option>
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
                <option key={lot.id} value={lot.id}>
                  {lot.codigo}
                </option>
              ))}
            </Select>
          ) : (
            <Input id="loteId" placeholder="Código de lote" value={values.loteId} onChange={(event) => updateField("loteId", event.target.value)} />
          )}
        </FormControl>

        <FormControl controlId="sexo">
          <Label>Sexo</Label>
          <Select id="sexo" value={values.sexo} placeholder="Seleccionar sexo" onValueChange={(value) => updateField("sexo", value)}>
            <option value="mixto">Mixto</option>
            <option value="hembra">Hembra</option>
            <option value="macho">Macho</option>
          </Select>
        </FormControl>

        <FormControl controlId="causaMuerte" className="md:col-span-2">
          <Label>Causa de muerte</Label>
          <Textarea
            id="causaMuerte"
            minRows={3}
            placeholder="Ej. estrés calórico, problemas respiratorios..."
            value={values.causaMuerte}
            onChange={(event) => updateField("causaMuerte", event.target.value)}
          />
        </FormControl>
      </section>

      <div className="flex justify-end">
        <Button type="submit" color="brand" loading={saving} loadingText="Guardando...">
          <Save aria-hidden="true" className="size-4" />
          Guardar registro
        </Button>
      </div>
    </form>
  );
}
