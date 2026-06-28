import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, DatePicker, FormControl, FormMessage, Input, Label, Select, Textarea, toast } from "quickit-ui";
import { Save, ShieldAlert } from "lucide-react";
import { usePermissions } from "@/features/auth/permissions";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { getLocalCatalogs } from "@/features/catalogs/catalogStore";
import { formatDateInput, parseDateInput, todayInput } from "@/lib/datetime";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import NumberStepper from "@/components/ui/NumberStepper";

const CAPITALIZATION_MIN_WEEKS = 25;

const initialForm = {
  fecha: todayInput(),
  tipo: "traslado",
  granjaId: "",
  loteId: "",
  origenGalponId: "",
  destinoGalponId: "",
  hembrasTrasladadas: "0",
  machosTrasladadas: "0",
  mortalidadHembras: "0",
  mortalidadMachos: "0",
  notas: "",
};

export default function TrasladosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { accessToken } = useAuth();
  const { can, dateConstraints } = usePermissions();
  const { filterCatalogs, hasAssignedFarms } = useFarmAccess();

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState("");

  const [catalogs, setCatalogs] = useState({ farms: [], sheds: [], lots: [] });
  const [inventoryList, setInventoryList] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Read search params
  const paramTipo = searchParams.get("tipo");
  const paramLoteId = searchParams.get("loteId");
  const paramOrigenId = searchParams.get("origenId");

  // Load catalogs
  useEffect(() => {
    getLocalCatalogs()
      .then((cats) => {
        const scoped = filterCatalogs(cats);
        setCatalogs(scoped);

        if (scoped.farms.length === 1) {
          updateField("granjaId", scoped.farms[0].id);
        }
      })
      .finally(() => setLoadingCatalogs(false));
  }, []);

  // Fetch inventory for selected farm to get live counts (optionally at transfer date)
  useEffect(() => {
    if (!form.granjaId) {
      setInventoryList([]);
      return;
    }

    setLoadingInventory(true);
    const params = new URLSearchParams({ granjaId: form.granjaId });
    if (form.fecha) {
      params.set("atDate", form.fecha);
    }

    api(`inventario?${params.toString()}`, { method: "GET", accessToken })
      .then((res) => {
        if (res.success) {
          setInventoryList(res.data);
        }
      })
      .finally(() => setLoadingInventory(false));
  }, [form.granjaId, form.fecha, accessToken]);

  // Apply URL params once catalogs & inventory are loaded
  useEffect(() => {
    if (loadingCatalogs) return;

    const farmId = form.granjaId;
    if (paramLoteId) {
      const lot = catalogs.lots.find((l) => l.id === paramLoteId);
      if (lot) {
        setForm((prev) => ({
          ...prev,
          tipo: paramTipo || "traslado",
          granjaId: lot.granjaId,
          loteId: paramLoteId,
          origenGalponId: paramOrigenId || "",
        }));
      }
    }
  }, [loadingCatalogs, paramTipo, paramLoteId, paramOrigenId, catalogs]);

  // Derived options
  const filteredLots = useMemo(() => {
    if (!form.granjaId) return [];
    // Show lots belonging to the selected farm
    return catalogs.lots.filter((l) => l.granjaId === form.granjaId && l.estado === "activo");
  }, [catalogs.lots, form.granjaId]);

  // Galpones de origen: derived from active inventory for the selected lot
  const activePlacements = useMemo(() => {
    if (!form.loteId) return [];
    return inventoryList.filter((item) => item.lote?.id === form.loteId);
  }, [inventoryList, form.loteId]);

  // Galpones de destino: all sheds in the selected farm EXCEPT the origin one
  const filteredDestSheds = useMemo(() => {
    if (!form.granjaId) return [];
    return catalogs.sheds.filter(
      (s) => s.granjaId === form.granjaId && s.id !== form.origenGalponId && s.active !== false
    );
  }, [catalogs.sheds, form.granjaId, form.origenGalponId]);

  // Current active placement details (including live birds)
  const currentPlacement = useMemo(() => {
    if (!form.loteId || !form.origenGalponId) return null;
    return activePlacements.find((p) => p.galpon?.id === form.origenGalponId) || null;
  }, [activePlacements, form.loteId, form.origenGalponId]);

  function updateField(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "granjaId") {
        next.loteId = "";
        next.origenGalponId = "";
        next.destinoGalponId = "";
        next.hembrasTrasladadas = "0";
        next.machosTrasladadas = "0";
        next.mortalidadHembras = "0";
        next.mortalidadMachos = "0";
      } else if (field === "loteId") {
        next.origenGalponId = "";
        next.destinoGalponId = "";
        next.hembrasTrasladadas = "0";
        next.machosTrasladadas = "0";
        next.mortalidadHembras = "0";
        next.mortalidadMachos = "0";
      } else if (field === "origenGalponId") {
        next.destinoGalponId = "";
        next.hembrasTrasladadas = "0";
        next.machosTrasladadas = "0";
        next.mortalidadHembras = "0";
        next.mortalidadMachos = "0";
      }
      return next;
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate() {
    const errs = {};
    if (!form.fecha) errs.fecha = "La fecha es obligatoria";
    if (!form.granjaId) errs.granjaId = "La granja es obligatoria";
    if (!form.loteId) errs.loteId = "El lote es obligatorio";
    if (!form.origenGalponId) errs.origenGalponId = "El galpón de origen es obligatorio";
    if (!form.destinoGalponId) errs.destinoGalponId = "El galpón de destino es obligatorio";
    if (form.origenGalponId && form.destinoGalponId && form.origenGalponId === form.destinoGalponId) {
      errs.destinoGalponId = "El galpón de destino debe ser diferente al de origen";
    }

    const qtyH = Number(form.hembrasTrasladadas);
    const qtyM = Number(form.machosTrasladadas);

    if (qtyH <= 0 && qtyM <= 0) {
      errs.hembrasTrasladadas = "Debes trasladar al menos una hembra o un macho";
    }

    if (currentPlacement) {
      if (qtyH > currentPlacement.hembras) {
        errs.hembrasTrasladadas = `Cantidad supera las hembras vivas (${currentPlacement.hembras})`;
      }
      if (qtyM > currentPlacement.machos) {
        errs.machosTrasladadas = `Cantidad supera los machos vivos (${currentPlacement.machos})`;
      }

      if (form.tipo === "capitalizacion") {
        if (currentPlacement.tipo !== "levante") {
          errs.origenGalponId = "Solo se puede capitalizar un alojamiento en fase de levante";
        } else if (currentPlacement.edadSemanas < CAPITALIZATION_MIN_WEEKS) {
          errs.tipo = `La capitalización requiere al menos ${CAPITALIZATION_MIN_WEEKS} semanas de edad (actual: ${currentPlacement.edadSemanas})`;
        }
      }
    }

    const mortH = Number(form.mortalidadHembras);
    const mortM = Number(form.mortalidadMachos);

    if (mortH > qtyH) {
      errs.mortalidadHembras = "La mortalidad no puede superar las aves trasladadas";
    }
    if (mortM > qtyM) {
      errs.mortalidadMachos = "La mortalidad no puede superar las aves trasladadas";
    }

    const netH = qtyH - mortH;
    const netM = qtyM - mortM;
    if ((qtyH > 0 || qtyM > 0) && netH <= 0 && netM <= 0) {
      errs.hembrasTrasladadas = "El traslado debe dejar aves vivas en el destino";
    }

    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!can("transfers.create")) {
      setGlobalError("No tienes permisos para realizar esta acción.");
      return;
    }

    setGlobalError("");
    const errs = validate();
    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const res = await api("traslados", {
        method: "POST",
        accessToken,
        body: JSON.stringify(form),
      });

      if (res.success) {
        toast({
          title: form.tipo === "capitalizacion" ? "Capitalización completada" : "Traslado registrado",
          kind: "success",
        });
        navigate("/inventario");
      } else {
        throw new Error(res.message || "Error al registrar el traslado");
      }
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!can("transfers.create")) {
    return (
      <Alert
        color="danger"
        title="Acceso denegado"
        description="No tienes permisos para registrar traslados o capitalizaciones."
        icon={ShieldAlert}
      />
    );
  }

  if (!hasAssignedFarms) {
    return (
      <Alert
        color="warning"
        title="Sin granjas asignadas"
        description="Tu usuario no tiene granjas asignadas. Comunícate con soporte para habilitar tu acceso."
      />
    );
  }

  const isCapitalizacion = form.tipo === "capitalizacion";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          {isCapitalizacion ? "Proceso de Capitalización" : "Nuevo Traslado de Aves"}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {isCapitalizacion
            ? "Cierra la etapa de levante/crianza de un lote y regístralo oficialmente en postura en su galpón definitivo."
            : "Mueve aves de un galpón de origen a un galpón de destino dentro de la misma granja."}
        </p>
      </div>

      {globalError && <Alert color="danger" title="Error" description={globalError} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cabecera del Formulario */}
        <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormControl controlId="tipo" required invalid={!!fieldErrors.tipo}>
              <Label>Tipo de movimiento</Label>
              <Select value={form.tipo} onValueChange={(val) => updateField("tipo", val)}>
                <option value="traslado">Traslado Simple</option>
                <option value="capitalizacion">Capitalización (Paso a Postura)</option>
              </Select>
              <FormMessage>{fieldErrors.tipo}</FormMessage>
            </FormControl>

            <FormControl controlId="fecha" required invalid={!!fieldErrors.fecha}>
              <Label>Fecha</Label>
              <DatePicker
                id="fecha"
                value={parseDateInput(form.fecha)}
                placeholder="Seleccionar fecha..."
                minDate={dateConstraints.minDate}
                maxDate={dateConstraints.maxDate}
                onChange={(date) => updateField("fecha", formatDateInput(date))}
              />
              <FormMessage>{fieldErrors.fecha}</FormMessage>
            </FormControl>
          </div>
        </section>

        {/* Origen del Movimiento */}
        <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5 space-y-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Origen</h2>

          <div className="space-y-4">
            <FormControl controlId="granjaId" required invalid={!!fieldErrors.granjaId}>
              <Label>Granja</Label>
              <Select value={form.granjaId} onValueChange={(val) => updateField("granjaId", val)}>
                <option value="">Seleccionar granja...</option>
                {catalogs.farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </Select>
              <FormMessage>{fieldErrors.granjaId}</FormMessage>
            </FormControl>

            <div className="grid grid-cols-2 gap-4">
              <FormControl controlId="loteId" required invalid={!!fieldErrors.loteId} disabled={!form.granjaId}>
                <Label>Lote</Label>
                <Select value={form.loteId} onValueChange={(val) => updateField("loteId", val)}>
                  <option value="">{form.granjaId ? "Seleccionar lote..." : "Selecciona granja primero"}</option>
                  {filteredLots.map((l) => (
                    <option key={l.id} value={l.id}>{l.codigo}</option>
                  ))}
                </Select>
                <FormMessage>{fieldErrors.loteId}</FormMessage>
              </FormControl>

              <FormControl controlId="origenGalponId" required invalid={!!fieldErrors.origenGalponId} disabled={!form.loteId || loadingInventory}>
                <Label>Galpón de Origen</Label>
                <Select value={form.origenGalponId} onValueChange={(val) => updateField("origenGalponId", val)}>
                  <option value="">{form.loteId ? "Seleccionar galpón..." : "Selecciona lote primero"}</option>
                  {activePlacements.map((p) => {
                    const fase = p.tipo || "levante";
                    const total = p.hembras + p.machos;
                    return (
                      <option key={p.galpon.id} value={p.galpon.id}>
                        {p.galpon.nombre} · {fase} · {total} vivas
                      </option>
                    );
                  })}
                </Select>
                <FormMessage>{fieldErrors.origenGalponId}</FormMessage>
              </FormControl>
            </div>

            {/* Info de Existencias del Origen */}
            {currentPlacement && (
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <span className="block text-xs text-zinc-400 font-medium uppercase">Hembras Vivas</span>
                  <span className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{currentPlacement.hembras}</span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-400 font-medium uppercase">Machos Vivos</span>
                  <span className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{currentPlacement.machos}</span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-400 font-medium uppercase">Edad del Lote</span>
                  <span className="text-xl font-bold tabular-nums text-brand-600 dark:text-brand-400">{currentPlacement.edadSemanas} sem</span>
                </div>
                {form.fecha && (
                  <p className="col-span-3 text-xs text-zinc-500 dark:text-zinc-400">
                    Existencias calculadas a la fecha seleccionada ({form.fecha}).
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Destino y Cantidad del Movimiento */}
        <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5 space-y-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Destino y Cantidades</h2>

          <div className="space-y-4">
            <FormControl controlId="destinoGalponId" required invalid={!!fieldErrors.destinoGalponId} disabled={!form.origenGalponId}>
              <Label>Galpón de Destino {isCapitalizacion && "(Fase Postura)"}</Label>
              <Select value={form.destinoGalponId} onValueChange={(val) => updateField("destinoGalponId", val)}>
                <option value="">{form.origenGalponId ? "Seleccionar galpón..." : "Selecciona origen primero"}</option>
                {filteredDestSheds.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </Select>
              <FormMessage>{fieldErrors.destinoGalponId}</FormMessage>
            </FormControl>

            <div className="grid grid-cols-2 gap-6 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              {/* Sección de Hembras */}
              <div className="space-y-4">
                <h3 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">Hembras</h3>
                <FormControl controlId="hembrasTrasladadas" required invalid={!!fieldErrors.hembrasTrasladadas} disabled={!form.destinoGalponId}>
                  <Label>Aves a trasladar</Label>
                  <NumberStepper
                    id="hembrasTrasladadas"
                    value={form.hembrasTrasladadas}
                    min={0}
                    max={currentPlacement?.hembras || 999999}
                    onChange={(val) => updateField("hembrasTrasladadas", val)}
                  />
                  <FormMessage>{fieldErrors.hembrasTrasladadas}</FormMessage>
                </FormControl>

                <FormControl controlId="mortalidadHembras" invalid={!!fieldErrors.mortalidadHembras} disabled={!form.destinoGalponId}>
                  <Label>Mortalidad en tránsito</Label>
                  <NumberStepper
                    id="mortalidadHembras"
                    value={form.mortalidadHembras}
                    min={0}
                    max={Number(form.hembrasTrasladadas) || 0}
                    onChange={(val) => updateField("mortalidadHembras", val)}
                  />
                  <FormMessage>{fieldErrors.mortalidadHembras}</FormMessage>
                </FormControl>
              </div>

              {/* Sección de Machos */}
              <div className="space-y-4">
                <h3 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">Machos</h3>
                <FormControl controlId="machosTrasladadas" required invalid={!!fieldErrors.machosTrasladadas} disabled={!form.destinoGalponId}>
                  <Label>Aves a trasladar</Label>
                  <NumberStepper
                    id="machosTrasladadas"
                    value={form.machosTrasladadas}
                    min={0}
                    max={currentPlacement?.machos || 999999}
                    onChange={(val) => updateField("machosTrasladadas", val)}
                  />
                  <FormMessage>{fieldErrors.machosTrasladadas}</FormMessage>
                </FormControl>

                <FormControl controlId="mortalidadMachos" invalid={!!fieldErrors.mortalidadMachos} disabled={!form.destinoGalponId}>
                  <Label>Mortalidad en tránsito</Label>
                  <NumberStepper
                    id="mortalidadMachos"
                    value={form.mortalidadMachos}
                    min={0}
                    max={Number(form.machosTrasladadas) || 0}
                    onChange={(val) => updateField("mortalidadMachos", val)}
                  />
                  <FormMessage>{fieldErrors.mortalidadMachos}</FormMessage>
                </FormControl>
              </div>
            </div>

            <FormControl controlId="notas">
              <Label>Notas</Label>
              <Textarea
                id="notas"
                minRows={2}
                placeholder="Motivo del traslado, observaciones de salud..."
                value={form.notas}
                onChange={(e) => updateField("notas", e.target.value)}
              />
            </FormControl>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate("/inventario")}>
            Cancelar
          </Button>
          <Button type="submit" color="brand" loading={saving} loadingText="Guardando...">
            <Save aria-hidden="true" className="mr-2 size-4" />
            {isCapitalizacion ? "Finalizar Capitalización" : "Confirmar Traslado"}
          </Button>
        </div>
      </form>
    </div>
  );
}
