import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Badge, Button, DatePicker, FormControl, FormMessage, Label, Select, Tabs, Textarea, toast } from "quickit-ui";
import { Save, ShieldAlert, ArrowRightLeft } from "lucide-react";
import { usePermissions } from "@/features/auth/permissions";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { getLocalCatalogs } from "@/features/catalogs/catalogStore";
import { formatDateInput, formatDateShort, formatDateTime, parseDateInput, todayInput, getAgeWeeks } from "@/lib/datetime";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import NumberStepper from "@/components/ui/NumberStepper";
import PageTable from "@/components/data/PageTable";

const CAPITALIZATION_MIN_WEEKS = 25;

const initialForm = {
  fecha: todayInput(),
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

export default function CapitalizacionPage() {
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

  const [transfers, setTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);

  const paramLoteId = searchParams.get("loteId");
  const paramOrigenId = searchParams.get("origenId");

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

  useEffect(() => {
    if (!accessToken) return;
    setLoadingTransfers(true);
    api("traslados", { method: "GET", accessToken })
      .then((res) => {
        if (res.success) {
          setTransfers(res.data.filter((t) => t.tipo === "capitalizacion"));
        }
      })
      .finally(() => setLoadingTransfers(false));
  }, [accessToken]);

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

  useEffect(() => {
    if (loadingCatalogs || !paramLoteId) return;

    const lot = catalogs.lots.find((l) => l.id === paramLoteId);
    if (lot) {
      setForm((prev) => ({
        ...prev,
        granjaId: lot.granjaId,
        loteId: paramLoteId,
        origenGalponId: paramOrigenId || "",
      }));
    }
  }, [loadingCatalogs, paramLoteId, paramOrigenId, catalogs]);

  const filteredLots = useMemo(() => {
    if (!form.granjaId) return [];
    return catalogs.lots.filter((l) => l.granjaId === form.granjaId && l.estado === "activo");
  }, [catalogs.lots, form.granjaId]);

  const activePlacements = useMemo(() => {
    if (!form.loteId) return [];
    return inventoryList.filter(
      (item) => item.lote?.id === form.loteId && item.tipo === "levante",
    );
  }, [inventoryList, form.loteId]);

  const filteredDestSheds = useMemo(() => {
    if (!form.granjaId) return [];
    return catalogs.sheds.filter(
      (s) => s.granjaId === form.granjaId && s.id !== form.origenGalponId && s.active !== false,
    );
  }, [catalogs.sheds, form.granjaId, form.origenGalponId]);

  const currentPlacement = useMemo(() => {
    if (!form.loteId || !form.origenGalponId) return null;
    return activePlacements.find((p) => p.galpon?.id === form.origenGalponId) || null;
  }, [activePlacements, form.loteId, form.origenGalponId]);

  const transferColumns = useMemo(() => [
    {
      key: "lote",
      header: "Lote",
      render: (row) => (
        <span className="font-medium">{row.loteId?.codigo || "—"}</span>
      ),
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (row) => formatDateShort(row.fecha),
    },
    {
      key: "edad",
      header: "Edad",
      align: "right",
      render: (row) => {
        const fechaAloj = row.loteId?.fechaAlojamiento;
        const weeks = fechaAloj ? getAgeWeeks(fechaAloj, row.fecha) : null;
        return (
          <span className="tabular-nums font-medium text-brand-600 dark:text-brand-400">
            {weeks != null ? `${weeks} sem` : "—"}
          </span>
        );
      },
    },
    {
      key: "hembras",
      header: "Hembras",
      align: "right",
      render: (row) => (
        <span className="tabular-nums">{row.hembrasTrasladadas}</span>
      ),
    },
    {
      key: "machos",
      header: "Machos",
      align: "right",
      render: (row) => (
        <span className="tabular-nums">{row.machosTrasladadas}</span>
      ),
    },
    {
      key: "mortalidadH",
      header: "Mort. H",
      align: "right",
      render: (row) => (
        <span className="tabular-nums text-danger-600 dark:text-danger-400">
          {row.mortalidadHembras > 0 ? row.mortalidadHembras : "—"}
        </span>
      ),
    },
    {
      key: "mortalidadM",
      header: "Mort. M",
      align: "right",
      render: (row) => (
        <span className="tabular-nums text-danger-600 dark:text-danger-400">
          {row.mortalidadMachos > 0 ? row.mortalidadMachos : "—"}
        </span>
      ),
    },
    {
      key: "origen",
      header: "Origen",
      render: (row) => (
        <span className="text-zinc-500">{row.origenGalponId?.nombre || "—"}</span>
      ),
    },
    {
      key: "destino",
      header: "Destino",
      render: (row) => (
        <span className="text-zinc-500">{row.destinoGalponId?.nombre || "—"}</span>
      ),
    },
  ], []);

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
      errs.hembrasTrasladadas = "Debes capitalizar al menos una hembra o un macho";
    }

    if (currentPlacement) {
      if (qtyH > currentPlacement.hembras) {
        errs.hembrasTrasladadas = `Cantidad supera las hembras vivas (${currentPlacement.hembras})`;
      }
      if (qtyM > currentPlacement.machos) {
        errs.machosTrasladadas = `Cantidad supera los machos vivos (${currentPlacement.machos})`;
      }
      if (currentPlacement.edadSemanas < CAPITALIZATION_MIN_WEEKS) {
        errs.origenGalponId = `La capitalización requiere al menos ${CAPITALIZATION_MIN_WEEKS} semanas de edad (actual: ${currentPlacement.edadSemanas})`;
      }
    }

    const mortH = Number(form.mortalidadHembras);
    const mortM = Number(form.mortalidadMachos);

    if (mortH > qtyH) {
      errs.mortalidadHembras = "La mortalidad no puede superar las aves capitalizadas";
    }
    if (mortM > qtyM) {
      errs.mortalidadMachos = "La mortalidad no puede superar las aves capitalizadas";
    }

    const netH = qtyH - mortH;
    const netM = qtyM - mortM;
    if ((qtyH > 0 || qtyM > 0) && netH <= 0 && netM <= 0) {
      errs.hembrasTrasladadas = "La capitalización debe dejar aves vivas en el galpón de postura";
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
        body: JSON.stringify({ ...form, tipo: "capitalizacion" }),
      });

      if (res.success) {
        toast({ title: "Capitalización completada", kind: "success" });
        navigate("/inventario");
      } else {
        throw new Error(res.message || "Error al registrar la capitalización");
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
        description="No tienes permisos para registrar capitalizaciones."
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Capitalización
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Pasa un lote de levante a postura moviendo las aves al galpón de producción.
        </p>
      </div>

      <Tabs defaultValue="nueva" color="brand">
        <Tabs.List>
          <Tabs.Trigger value="nueva">Nueva capitalización</Tabs.Trigger>
          <Tabs.Trigger value="historial">Historial</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="nueva" className="pt-4">
          {globalError && <Alert color="danger" title="Error" description={globalError} />}

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
              <FormControl controlId="fecha" required invalid={!!fieldErrors.fecha}>
                <Label>Fecha de capitalización</Label>
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
            </section>

            <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5 space-y-4">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Origen (Levante)</h2>

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
                  <Label>Galpón de origen</Label>
                  <Select value={form.origenGalponId} onValueChange={(val) => updateField("origenGalponId", val)}>
                    <option value="">{form.loteId ? "Seleccionar galpón..." : "Selecciona lote primero"}</option>
                    {activePlacements.map((p) => {
                      const total = p.hembras + p.machos;
                      return (
                        <option key={p.galpon.id} value={p.galpon.id}>
                          {p.galpon.nombre} · {total} vivas · {p.edadSemanas} sem
                        </option>
                      );
                    })}
                  </Select>
                  <FormMessage>{fieldErrors.origenGalponId}</FormMessage>
                </FormControl>
              </div>

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
                </div>
              )}
            </section>

            <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5 space-y-4">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Destino (Postura)</h2>

              <FormControl controlId="destinoGalponId" required invalid={!!fieldErrors.destinoGalponId} disabled={!form.origenGalponId}>
                <Label>Galpón de postura</Label>
                <Select value={form.destinoGalponId} onValueChange={(val) => updateField("destinoGalponId", val)}>
                  <option value="">{form.origenGalponId ? "Seleccionar galpón..." : "Selecciona origen primero"}</option>
                  {filteredDestSheds.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </Select>
                <FormMessage>{fieldErrors.destinoGalponId}</FormMessage>
              </FormControl>

              <div className="grid grid-cols-2 gap-6 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">Hembras</h3>
                  <FormControl controlId="hembrasTrasladadas" required invalid={!!fieldErrors.hembrasTrasladadas} disabled={!form.destinoGalponId}>
                    <Label>Aves a capitalizar</Label>
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

                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">Machos</h3>
                  <FormControl controlId="machosTrasladadas" required invalid={!!fieldErrors.machosTrasladadas} disabled={!form.destinoGalponId}>
                    <Label>Aves a capitalizar</Label>
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
                  placeholder="Observaciones de la capitalización..."
                  value={form.notas}
                  onChange={(e) => updateField("notas", e.target.value)}
                />
              </FormControl>
            </section>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => navigate("/inventario")}>
                Cancelar
              </Button>
              <Button type="submit" color="brand" loading={saving} loadingText="Guardando...">
                <Save aria-hidden="true" className="mr-2 size-4" />
                Finalizar capitalización
              </Button>
            </div>
          </form>
        </Tabs.Content>

        <Tabs.Content value="historial" className="pt-4">
          <PageTable
            columns={transferColumns}
            data={transfers}
            rowKey={(row) => row._id || row.id}
            loading={loadingTransfers}
            stickyHeader
            color="neutral"
            limit={20}
            skeletonRows={5}
            emptyIcon={ArrowRightLeft}
            emptyTitle="Sin capitalizaciones"
            emptyDescription="Aún no se han registrado capitalizaciones."
          />
        </Tabs.Content>
      </Tabs>
    </div>
  );
}
