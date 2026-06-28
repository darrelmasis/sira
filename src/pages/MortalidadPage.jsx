import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  FormControl,
  FormMessage,
  Input,
  Label,
  Select,
  Textarea,
  toast,
  DatePicker,
  useBreakpoint,
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
  sexo: "macho",
  causaMuerte: "",
};

const sexoOptions = [
  { value: "macho", label: "Macho" },
  { value: "hembra", label: "Hembra" },
];

function validateMortalidad(values, validateRecordDate) {
  const errors = {};
  const dateError = validateRecordDate(values.fecha);
  if (dateError) errors.fecha = dateError;
  if (!values.granjaId.trim()) errors.granjaId = "La granja es obligatoria.";
  if (!values.galponId.trim()) errors.galponId = "El galpón es obligatorio.";
  if (!values.loteId.trim()) errors.loteId = "El lote es obligatorio.";
  if (values.mortalidad === "" || Number(values.mortalidad) < 1)
    errors.mortalidad = "La mortalidad debe ser mayor a cero.";
  if (!values.causaMuerte.trim())
    errors.causaMuerte = "La causa de muerte es obligatoria.";
  return errors;
}

function validateCatalogRefs(values, catalogs) {
  const errors = {};
  const farm = catalogs.farms.find(
    (item) => normalizeId(item.id) === normalizeId(values.granjaId),
  );
  if (!farm)
    errors.granjaId = "La granja seleccionada no está disponible. Actualiza catálogos.";

  const shed = catalogs.sheds.find(
    (item) => normalizeId(item.id) === normalizeId(values.galponId),
  );
  if (!shed)
    errors.galponId = "El galpón seleccionado no está disponible. Actualiza catálogos.";

  const lot = catalogs.lots.find(
    (item) => normalizeId(item.id) === normalizeId(values.loteId),
  );
  if (!lot)
    errors.loteId = "El lote seleccionado no está disponible. Actualiza catálogos.";

  // Validate galponId matches an active placement for the selected lot
  if (values.loteId && values.galponId) {
    const lotPlacements = catalogs.placements.filter(
      (p) =>
        normalizeId(p.loteId) === normalizeId(values.loteId) &&
        p.estado !== "cerrado",
    );
    const validShedIds = new Set(lotPlacements.map((p) => normalizeId(p.galponId)));
    if (!validShedIds.has(normalizeId(values.galponId))) {
      errors.galponId = "El galpón no tiene un alojamiento activo para este lote. Selecciona un galpón válido.";
    }
  }

  return errors;
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
  const [catalogs, setCatalogs] = useState({ farms: [], sheds: [], lots: [], placements: [] });
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { isMobile } = useBreakpoint();

  const filteredSheds = useMemo(() => {
    if (!values.loteId) return [];
    const lotPlacements = catalogs.placements.filter(
      (p) =>
        normalizeId(p.loteId) === normalizeId(values.loteId) &&
        p.estado !== "cerrado",
    );
    const validShedIds = new Set(lotPlacements.map((p) => normalizeId(p.galponId)));
    return catalogs.sheds.filter((shed) => validShedIds.has(normalizeId(shed.id)));
  }, [catalogs.sheds, catalogs.placements, values.loteId]);

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
        next.loteId = "";
        next.galponId = "";
      }
      if (field === "loteId") {
        next.galponId = "";
      }
      return next;
    });
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!can("records.create")) {
      setError("No tienes permiso para crear registros.");
      return;
    }
    setError("");

    const errors = validateMortalidad(values, validateRecordDate);
    const catalogErrors = validateCatalogRefs(values, catalogs);
    const merged = { ...errors, ...catalogErrors };
    setFieldErrors(merged);
    if (Object.keys(merged).length > 0) {
      requestAnimationFrame(() => {
        const el = document.querySelector('[aria-invalid="true"]');
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-4">
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

      <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
        <SectionHeader icon={MapPin} title="Ubicación" />

        <div className="space-y-4">
          <FormControl controlId="granjaId" required invalid={!!fieldErrors.granjaId}>
            <Label>Granja</Label>
            {catalogs.farms.length > 0 ? (
              <Select
                id="granjaId"
                value={values.granjaId}
                placeholder="Seleccionar granja..."
                onValueChange={(value) => updateField("granjaId", value)}
              >
                <option key="placeholder-granja" value="">Seleccionar granja...</option>
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
            <FormMessage>{fieldErrors.granjaId}</FormMessage>
          </FormControl>

          <div className="grid grid-cols-2 gap-4">
            <FormControl controlId="loteId" required invalid={!!fieldErrors.loteId}>
              <Label>Lote</Label>
              {filteredLots.length > 0 ? (
                <Select
                  id="loteId"
                  value={values.loteId}
                  placeholder="Seleccionar..."
                  onValueChange={(value) => updateField("loteId", value)}
                >
                  <option key="placeholder-lote" value="">Seleccionar...</option>
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
              <FormMessage>{fieldErrors.loteId}</FormMessage>
            </FormControl>

            <FormControl controlId="galponId" required invalid={!!fieldErrors.galponId}>
              <Label>Galpón</Label>
              {values.loteId && filteredSheds.length > 0 ? (
                <Select
                  id="galponId"
                  value={values.galponId}
                  placeholder="Seleccionar..."
                  onValueChange={(value) => updateField("galponId", value)}
                >
                  <option key="placeholder-galpon" value="">Seleccionar...</option>
                  {filteredSheds.map((shed) => (
                    <option key={shed.id} value={shed.id}>
                      {shed.nombre}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="galponId"
                  placeholder={values.loteId ? "Sin galpones con alojamiento activo" : "Selecciona un lote primero"}
                  value=""
                  disabled
                />
              )}
              <FormMessage>{fieldErrors.galponId}</FormMessage>
            </FormControl>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
        <SectionHeader icon={FileText} title="Detalles del Registro" />

        <div className="space-y-4">
          <FormControl controlId="fecha" required invalid={!!fieldErrors.fecha}>
            <Label>Fecha</Label>
            <DatePicker
              id="fecha"
              value={parseDateInput(values.fecha)}
              placeholder="Seleccionar fecha del registro"
              minDate={dateConstraints.minDate}
              maxDate={dateConstraints.maxDate}
              onChange={(date) => updateField("fecha", formatDateInput(date))}
            />
            <FormMessage>{fieldErrors.fecha}</FormMessage>
          </FormControl>

          <div>
            <Label>Sexo *</Label>
            <div className="mt-1.5 flex gap-2">
              {sexoOptions.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={values.sexo === opt.value ? "solid" : "ghost"}
                  color="brand"
                  onClick={() => updateField("sexo", opt.value)}
                  className="flex-1"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
        <SectionHeader icon={BarChart3} title="Métricas" />

        <div className="space-y-4">
          <FormControl controlId="mortalidad" required invalid={!!fieldErrors.mortalidad}>
            <Label>Cantidad de aves muertas</Label>
            <NumberStepper
              id="mortalidad"
              value={values.mortalidad}
              min={0}
              onChange={(value) => updateField("mortalidad", value)}
            />
            <FormMessage>{fieldErrors.mortalidad}</FormMessage>
          </FormControl>

          <FormControl controlId="causaMuerte" required invalid={!!fieldErrors.causaMuerte}>
            <Label>Causa de muerte</Label>
            <Select
              id="causaMuerte"
              value={["Mortalidad natural", "Necropsia", "Ovoscopia", "Descarte", "Venta"].includes(values.causaMuerte) ? values.causaMuerte : (values.causaMuerte ? "Otro" : "")}
              placeholder="Seleccionar causa..."
              onValueChange={(val) => {
                if (val === "Otro") {
                  updateField("causaMuerte", "Otro: ");
                } else {
                  updateField("causaMuerte", val);
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
            <FormMessage>{fieldErrors.causaMuerte}</FormMessage>
          </FormControl>

          {(!["Mortalidad natural", "Necropsia", "Ovoscopia", "Descarte", "Venta", ""].includes(values.causaMuerte) || values.causaMuerte.startsWith("Otro: ")) && (
            <FormControl controlId="causaMuerteEspecificar" required invalid={!!fieldErrors.causaMuerte}>
              <Label>Especificar causa</Label>
              <Input
                id="causaMuerteEspecificar"
                placeholder="Escribe la causa detallada aquí..."
                value={values.causaMuerte.startsWith("Otro: ") ? values.causaMuerte.replace("Otro: ", "") : values.causaMuerte}
                onChange={(e) => updateField("causaMuerte", `Otro: ${e.target.value}`)}
              />
            </FormControl>
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          type="submit"
          color="brand"
          loading={saving}
          loadingText="Guardando..."
          fullWidth={isMobile}
        >
          <Save aria-hidden="true" className="size-4" />
          Guardar registro
        </Button>
      </div>
    </form>
  );
}
