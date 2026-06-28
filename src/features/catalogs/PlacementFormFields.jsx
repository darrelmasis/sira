import { useEffect, useState } from "react";
import { Alert, FormControl, Input, Label, Select, DatePicker } from "quickit-ui";
import { api } from "@/lib/api";
import { formatDateInput, parseDateInput } from "@/lib/datetime";

export default function PlacementFormFields({ form, setForm, meta, editing, accessToken }) {
  const [distribution, setDistribution] = useState(null);
  const [loadingDistribution, setLoadingDistribution] = useState(false);

  const farms = meta.farms || [];
  const allLots = meta.lots || [];
  const allSheds = meta.sheds || [];

  const filteredLots = form.granjaId
    ? allLots.filter((l) => String(l.granjaId) === String(form.granjaId))
    : allLots;

  const filteredSheds = form.granjaId
    ? allSheds.filter((s) => String(s.granjaId) === String(form.granjaId))
    : allSheds;

  useEffect(() => {
    if (!form.loteId || !accessToken) {
      setDistribution(null);
      return;
    }

    setLoadingDistribution(true);
    const params = new URLSearchParams({ loteId: form.loteId });
    if (editing?.id) {
      params.set("excludePlacementId", editing.id);
    }

    api(`lotes/distribucion?${params.toString()}`, { method: "GET", accessToken })
      .then((res) => {
        if (res.success) {
          setDistribution(res.data);
        } else {
          setDistribution(null);
        }
      })
      .catch(() => setDistribution(null))
      .finally(() => setLoadingDistribution(false));
  }, [form.loteId, editing?.id, accessToken]);

  const pendingAfterHembras =
    distribution != null
      ? distribution.pendingHembras - Number(form.hembras || 0) - Number(form.mortalidadAlojamientoHembras || 0)
      : null;
  const pendingAfterMachos =
    distribution != null
      ? distribution.pendingMachos - Number(form.machos || 0) - Number(form.mortalidadAlojamientoMachos || 0)
      : null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {form.loteId && distribution && (
        <Alert
          color="neutral"
          className="col-span-2"
          title={`Distribución del lote ${distribution.codigo}`}
          description={
            loadingDistribution
              ? "Calculando pendientes..."
              : `Total del lote: ${distribution.lotHembras} hembras, ${distribution.lotMachos} machos. ` +
                `Alojadas: ${distribution.allocatedHembras} / ${distribution.allocatedMachos}. ` +
                `Mortalidad de alojamiento registrada: ${distribution.intakeMortalityHembras} / ${distribution.intakeMortalityMachos}. ` +
                `Pendiente por asignar: ${distribution.pendingHembras} hembras, ${distribution.pendingMachos} machos.`
          }
        />
      )}

      <FormControl required className="col-span-2">
        <Label>Fecha de alojamiento</Label>
        <DatePicker
          value={parseDateInput(form.fechaAlojamiento)}
          onChange={(date) => setForm({ ...form, fechaAlojamiento: formatDateInput(date) })}
        />
      </FormControl>
      <FormControl required className="col-span-2">
        <Label>Granja</Label>
        <Select
          value={form.granjaId}
          onValueChange={(val) => setForm({ ...form, granjaId: val, loteId: "", galponId: "" })}
        >
          <option value="">Seleccionar granja...</option>
          {farms.map((farm) => (
            <option key={farm.id} value={farm.id}>
              {farm.nombre}
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl required>
        <Label>Lote</Label>
        <Select
          value={form.loteId}
          onValueChange={(val) => setForm({ ...form, loteId: val, galponId: "" })}
          disabled={!form.granjaId}
        >
          <option value="">{form.granjaId ? "Seleccionar lote..." : "Selecciona una granja primero"}</option>
          {filteredLots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.codigo} ({lot.hembras} H / {lot.machos} M)
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl required>
        <Label>Galpón</Label>
        <Select
          value={form.galponId}
          onValueChange={(val) => setForm({ ...form, galponId: val })}
          disabled={!form.granjaId}
        >
          <option value="">{form.granjaId ? "Seleccionar galpón..." : "Selecciona una granja primero"}</option>
          {filteredSheds.map((shed) => (
            <option key={shed.id} value={shed.id}>
              {shed.nombre}
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl required>
        <Label>Fase de Alojamiento</Label>
        <Select value={form.tipo || "levante"} onValueChange={(val) => setForm({ ...form, tipo: val })}>
          <option value="levante">Levante</option>
          <option value="postura">Postura</option>
        </Select>
      </FormControl>
      <FormControl required>
        <Label>Estado</Label>
        <Select value={form.estado || "activo"} onValueChange={(val) => setForm({ ...form, estado: val })}>
          <option value="activo">Activo</option>
          <option value="cerrado">Cerrado</option>
        </Select>
      </FormControl>
      <FormControl>
        <Label>Hembras a alojar</Label>
        <Input
          type="number"
          min="0"
          max={distribution?.pendingHembras ?? undefined}
          value={form.hembras}
          onChange={(e) => setForm({ ...form, hembras: Number(e.target.value) })}
          onFocus={(e) => e.target.select()}
        />
      </FormControl>
      <FormControl>
        <Label>Machos a alojar</Label>
        <Input
          type="number"
          min="0"
          max={distribution?.pendingMachos ?? undefined}
          value={form.machos}
          onChange={(e) => setForm({ ...form, machos: Number(e.target.value) })}
          onFocus={(e) => e.target.select()}
        />
      </FormControl>

      {!editing && (
        <>
          <FormControl className="col-span-2">
            <Label>Mortalidad en alojamiento (hembras)</Label>
            <Input
              type="number"
              min="0"
              value={form.mortalidadAlojamientoHembras ?? 0}
              onChange={(e) =>
                setForm({ ...form, mortalidadAlojamientoHembras: Number(e.target.value) })
              }
              onFocus={(e) => e.target.select()}
            />
          </FormControl>
          <FormControl className="col-span-2">
            <Label>Mortalidad en alojamiento (machos)</Label>
            <Input
              type="number"
              min="0"
              value={form.mortalidadAlojamientoMachos ?? 0}
              onChange={(e) =>
                setForm({ ...form, mortalidadAlojamientoMachos: Number(e.target.value) })
              }
              onFocus={(e) => e.target.select()}
            />
          </FormControl>
          <FormControl className="col-span-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(form.cerrarDistribucion)}
                onChange={(e) => setForm({ ...form, cerrarDistribucion: e.target.checked })}
              />
              Cerrar distribución del lote (todas las aves deben quedar alojadas o como mortalidad)
            </Label>
          </FormControl>
          {pendingAfterHembras != null && pendingAfterMachos != null && (pendingAfterHembras > 0 || pendingAfterMachos > 0) && (
            <p className="col-span-2 text-sm text-amber-600 dark:text-amber-400">
              Tras este registro quedarían pendientes {Math.max(0, pendingAfterHembras)} hembras y{" "}
              {Math.max(0, pendingAfterMachos)} machos sin asignar.
            </p>
          )}
        </>
      )}
    </div>
  );
}
