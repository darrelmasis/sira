import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  FormControl,
  Input,
  Label,
  Select,
  Textarea,
  toast,
  DatePicker,
  cn,
} from "quickit-ui";
import { MapPin, FileText, BarChart3, Save } from "lucide-react";
import NumberStepper from "@/components/ui/NumberStepper";
import FormSectionSkeleton from "@/components/feedback/FormSectionSkeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { usePermissions } from "@/features/auth/permissions";
import { getLocalCatalogs } from "@/features/catalogs/catalogStore";
import { enqueueRecord } from "@/features/sync/syncQueue";
import { useSync } from "@/features/sync/SyncProvider";
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

const sexoOptions = [
  { value: "mixto", label: "Mixto" },
  { value: "macho", label: "Macho" },
  { value: "hembra", label: "Hembra" },
];

function validateMortalidad(values, validateRecordDate) {
  const dateError = validateRecordDate(values.fecha);
  if (dateError) return dateError;
  if (!values.granjaId.trim()) return "La granja es obligatoria.";
  if (!values.galponId.trim()) return "El galpón es obligatorio.";
  if (!values.loteId.trim()) return "El lote es obligatorio.";
  if (values.mortalidad === "" || Number(values.mortalidad) < 0)
    return "La mortalidad debe ser cero o mayor.";
  return "";
}

function validateCatalogRefs(values, catalogs) {
  const farm = catalogs.farms.find(
    (item) => normalizeId(item.id) === normalizeId(values.granjaId),
  );
  if (!farm)
    return "La granja seleccionada no está disponible. Actualiza catálogos en Configuración del sistema.";

  const shed = catalogs.sheds.find(
    (item) => normalizeId(item.id) === normalizeId(values.galponId),
  );
  if (!shed)
    return "El galpón seleccionado no está disponible. Actualiza catálogos en Configuración del sistema.";

  const lot = catalogs.lots.find(
    (item) => normalizeId(item.id) === normalizeId(values.loteId),
  );
  if (!lot)
    return "El lote seleccionado no está disponible. Actualiza catálogos en Configuración del sistema.";

  return "";
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="size-5 text-brand-500" />
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  );
}

export default function MortalidadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { validateRecordDate, dateConstraints, can } = usePermissions();
  const { filterCatalogs, hasAssignedFarms, canAccessFarm } = useFarmAccess();
  const { syncAfterSave, isOnline } = useSync();
  const [values, setValues] = useState(initialForm);
  const [catalogs, setCatalogs] = useState({ farms: [], sheds: [], lots: [] });
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredSheds = useMemo(
    () =>
      catalogs.sheds.filter(
        (shed) =>
          !values.granjaId ||
          normalizeId(shed.granjaId) === normalizeId(values.granjaId),
      ),
    [catalogs.sheds, values.granjaId],
  );

  const filteredLots = useMemo(
    () =>
      catalogs.lots.filter(
        (lot) =>
          !values.granjaId ||
          normalizeId(lot.granjaId) === normalizeId(values.granjaId),
      ),
    [catalogs.lots, values.granjaId],
  );

  useEffect(() => {
    let active = true;

    getLocalCatalogs()
      .then((nextCatalogs) => {
        if (!active) return;
        const scoped = filterCatalogs(nextCatalogs);
        setCatalogs(scoped);

        if (scoped.farms.length === 1) {
          setValues((current) => ({
            ...current,
            granjaId: scoped.farms[0].id,
          }));
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

  if (
    catalogs.farms.length === 0 ||
    catalogs.sheds.length === 0 ||
    catalogs.lots.length === 0
  ) {
    return (
      <Alert
        color="warning"
        title="Catálogos incompletos"
        description="Necesitas granjas, galpones y lotes cargados. Ve a Configuración del sistema → Actualizar catálogos o pide a un administrador que complete los catálogos."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-4 pb-20">
      {error && <Alert color="danger" title={error} />}

      {!can("records.editAnyDate") && (
        <Alert
          color="info"
          title="Fecha restringida"
          description="Como operario solo puedes registrar actividades del día de hoy."
        />
      )}

      <div className="text-sm text-zinc-500 dark:text-zinc-400 -mt-2 mb-4">
        Complete los detalles para registrar la baja de aves.
      </div>

      <section className="rounded-xl border border-zinc-200/80 p-4 dark:border-zinc-800 sm:p-5">
        <SectionHeader icon={MapPin} title="Ubicación" />

        <div className="space-y-4">
          <FormControl controlId="granjaId" required>
            <Label>Granja</Label>
            {catalogs.farms.length > 0 ? (
              <Select
                id="granjaId"
                value={values.granjaId}
                placeholder="Seleccionar granja..."
                onValueChange={(value) => updateField("granjaId", value)}
              >
                <option value="">Seleccionar granja...</option>
                {catalogs.farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.nombre}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="granjaId"
                placeholder="ID de granja"
                value={values.granjaId}
                onChange={(event) => updateField("granjaId", event.target.value)}
              />
            )}
          </FormControl>

          <div className="grid grid-cols-2 gap-4">
            <FormControl controlId="galponId" required>
              <Label>Galpón</Label>
              {filteredSheds.length > 0 ? (
                <Select
                  id="galponId"
                  value={values.galponId}
                  placeholder="Seleccionar..."
                  onValueChange={(value) => updateField("galponId", value)}
                >
                  <option value="">Seleccionar...</option>
                  {filteredSheds.map((shed) => (
                    <option key={shed.id} value={shed.id}>
                      {shed.nombre}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="galponId"
                  placeholder="ID de galpón"
                  value={values.galponId}
                  onChange={(event) =>
                    updateField("galponId", event.target.value)
                  }
                />
              )}
            </FormControl>

            <FormControl controlId="loteId" required>
              <Label>Lote</Label>
              {filteredLots.length > 0 ? (
                <Select
                  id="loteId"
                  value={values.loteId}
                  placeholder="Seleccionar..."
                  onValueChange={(value) => updateField("loteId", value)}
                >
                  <option value="">Seleccionar...</option>
                  {filteredLots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.codigo}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="loteId"
                  placeholder="Código de lote"
                  value={values.loteId}
                  onChange={(event) =>
                    updateField("loteId", event.target.value)
                  }
                />
              )}
            </FormControl>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200/80 p-4 dark:border-zinc-800 sm:p-5">
        <SectionHeader icon={FileText} title="Detalles del Registro" />

        <div className="space-y-4">
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

          <div>
            <Label>Sexo *</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
              {sexoOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField("sexo", opt.value)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    values.sexo === opt.value
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200/80 p-4 dark:border-zinc-800 sm:p-5">
        <SectionHeader icon={BarChart3} title="Métricas" />

        <div className="space-y-4">
          <FormControl controlId="mortalidad" required>
            <Label>Cantidad de aves muertas</Label>
            <NumberStepper
              id="mortalidad"
              value={values.mortalidad}
              min={0}
              onChange={(value) => updateField("mortalidad", value)}
            />
          </FormControl>

          <FormControl controlId="causaMuerte">
            <Label>Causa de muerte</Label>
            <Textarea
              id="causaMuerte"
              minRows={3}
              placeholder="Ej. estrés calórico, problemas respiratorios..."
              value={values.causaMuerte}
              onChange={(event) =>
                updateField("causaMuerte", event.target.value)
              }
            />
          </FormControl>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-zinc-200/80 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
        <Button
          type="submit"
          color="brand"
          loading={saving}
          loadingText="Guardando..."
          className="mx-auto w-full max-w-3xl"
        >
          <Save aria-hidden="true" className="size-4" />
          Guardar registro
        </Button>
      </div>
    </form>
  );
}
