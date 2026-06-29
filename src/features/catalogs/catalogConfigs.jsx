import { FormControl, FormDescription, Input, Label, Select, DatePicker } from "quickit-ui";
import { Building2, Layers, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import {
  isDuplicateCode,
  isDuplicateComplex,
  isDuplicateName,
  isDuplicatePlacement,
  labelForId,
  normalizeId,
} from "@/lib/catalog-utils";
import { formatDateInput, formatDateShort, parseDateInput, todayInput, getAgeWeeks } from "@/lib/datetime";
import RowActionsDropdown from "@/components/ui/RowActionsDropdown";
import PlacementFormFields from "./PlacementFormFields";

const farmInitialForm = { nombre: "", tipo: "engorde" };

export const farmCatalogConfig = {
  resource: "granjas",
  loadError: "Error al cargar granjas",
  createLabel: "Nueva granja",
  createSuccess: "Granja creada",
  updateSuccess: "Granja actualizada",
  deleteTitle: "Eliminar granja",
  deleteDescription: "¿Seguro que deseas eliminar esta granja?",
  deleteSuccess: "Granja eliminada",
  modalTitles: { create: "Nueva granja", edit: "Editar granja" },
  skeleton: { columns: 2, rows: 2 },
  initialForm: () => ({ ...farmInitialForm }),
  toForm: (row) => ({ nombre: row.nombre, tipo: row.tipo }),
  load: async ({ accessToken, setData }) => {
    const response = await api("granjas", { method: "GET", accessToken });
    if (response.success) setData(response.data);
  },
  validate: (form, data, editing) => {
    const nombre = form.nombre.trim();
    if (!nombre) return "El nombre es obligatorio";
    if (isDuplicateName(data, nombre, editing?.id)) return "Ya existe una granja con ese nombre";
    return "";
  },
  toPayload: (form) => ({ ...form, nombre: form.nombre.trim() }),
  buildColumns: ({ openEdit, handleDelete }) => [
    { key: "nombre", header: "Nombre", render: (row) => row.nombre },
    { key: "tipo", header: "Tipo", render: (row) => <span className="capitalize">{row.tipo}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <RowActionsDropdown onEdit={() => openEdit(row)} onDelete={() => handleDelete(row.id)} />
      ),
    },
  ],
  getEmpty: () => ({
    icon: Building2,
    title: "Sin granjas",
    description: "Crea la primera granja para empezar a configurar complejos y lotes.",
    actionsLabel: "Crear granja",
  }),
  renderForm: ({ form, setForm }) => (
    <>
      <FormControl required>
        <Label>Nombre</Label>
        <Input
          value={form.nombre}
          placeholder="Ej. Granja El Progreso"
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
      </FormControl>
      <FormControl required>
        <Label>Tipo</Label>
        <Select value={form.tipo} onValueChange={(val) => setForm({ ...form, tipo: val })}>
          <option value="engorde">Engorde</option>
          <option value="reproductora">Reproductora</option>
        </Select>
      </FormControl>
    </>
  ),
};

export const complexCatalogConfig = {
  resource: "complejos",
  loadError: "Error al cargar complejos",
  createLabel: "Nuevo complejo",
  createSuccess: "Complejo creado (2 galpones generados)",
  updateSuccess: "Complejo actualizado",
  deleteTitle: "Eliminar complejo",
  deleteDescription: "Se eliminarán los dos galpones del complejo si no tienen alojamientos.",
  deleteSuccess: "Complejo eliminado",
  modalTitles: { create: "Nuevo complejo", edit: "Editar complejo" },
  skeleton: { columns: 4, rows: 4 },
  initialForm: (meta) => ({ nombre: "", granjaId: meta.farms?.[0]?.id || "" }),
  toForm: (row) => ({ nombre: row.nombre, granjaId: row.granjaId }),
  load: async ({ accessToken, setData, setMeta }) => {
    const [complexesRes, farmsRes] = await Promise.all([
      api("complejos", { method: "GET", accessToken }),
      api("granjas", { method: "GET", accessToken }),
    ]);
    if (complexesRes.success) setData(complexesRes.data);
    if (farmsRes.success) setMeta({ farms: farmsRes.data });
  },
  canCreate: (meta) => (meta.farms?.length ?? 0) > 0,
  validate: (form, data, editing) => {
    const nombre = form.nombre.trim();
    if (!nombre) return "El nombre del complejo es obligatorio";
    if (!editing && !form.granjaId) return "Selecciona una granja";
    if (isDuplicateComplex(data, { nombre, granjaId: form.granjaId }, editing?.id)) {
      return "Ya existe ese complejo en la granja";
    }
    return "";
  },
  toPayload: (form) => ({ ...form, nombre: form.nombre.trim() }),
  buildColumns: ({ meta, openEdit, handleDelete }) => [
    { key: "nombre", header: "Complejo", render: (row) => row.nombre },
    {
      key: "granja",
      header: "Granja",
      render: (row) => labelForId(meta.farms, row.granjaId, "nombre", "Sin granja"),
    },
    {
      key: "galpon1",
      header: "Galpón 1",
      render: (row) => row.galpones?.find((g) => g.numero === 1)?.nombre || "—",
    },
    {
      key: "galpon2",
      header: "Galpón 2",
      render: (row) => row.galpones?.find((g) => g.numero === 2)?.nombre || "—",
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <RowActionsDropdown onEdit={() => openEdit(row)} onDelete={() => handleDelete(row.id)} />
      ),
    },
  ],
  getPrerequisiteEmpty: (meta) =>
    (meta.farms?.length ?? 0) === 0
      ? {
          icon: Layers,
          title: "Primero crea una granja",
          description: "Necesitas al menos una granja antes de registrar complejos.",
        }
      : null,
  getEmpty: () => ({
    icon: Layers,
    title: "Sin complejos",
    description: "Registra un complejo y se crearán automáticamente sus dos galpones.",
    actionsLabel: "Crear complejo",
  }),
  renderForm: ({ form, setForm, meta, editing }) => {
    const previewName = form.nombre.trim();
    return (
      <>
        <FormControl required>
          <Label>Nombre del complejo</Label>
          <Input
            value={form.nombre}
            placeholder="Ej. Tempisque"
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          {!editing && previewName ? (
            <FormDescription>
              Se crearán los galpones <strong>{previewName} 1</strong> y <strong>{previewName} 2</strong>.
            </FormDescription>
          ) : null}
          {editing ? (
            <FormDescription>
              Al cambiar el nombre se actualizarán también los nombres de los galpones 1 y 2.
            </FormDescription>
          ) : null}
        </FormControl>
        <FormControl required={!editing}>
          <Label>Granja</Label>
          <Select
            value={form.granjaId}
            disabled={Boolean(editing)}
            onValueChange={(val) => setForm({ ...form, granjaId: val })}
          >
            {(meta.farms || []).map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.nombre}
              </option>
            ))}
          </Select>
        </FormControl>
      </>
    );
  },
};

const lotInitialForm = {
  codigo: "",
  granjaId: "",
  raza: "COBB",
  sexo: "mixto",
  hembras: 0,
  machos: 0,
  fechaAlojamiento: todayInput(),
};

export const lotCatalogConfig = {
  resource: "lotes",
  loadError: "Error al cargar lotes",
  createLabel: "Nuevo lote",
  createSuccess: "Lote creado",
  updateSuccess: "Lote actualizado",
  deleteTitle: "Eliminar lote",
  deleteDescription: "¿Seguro que deseas eliminar este lote?",
  deleteSuccess: "Lote eliminado",
  modalTitles: { create: "Nuevo lote", edit: "Editar lote" },
  skeleton: { columns: 7, rows: 5 },
  initialForm: (meta) => ({ ...lotInitialForm, granjaId: meta.farms?.[0]?.id || "" }),
  toForm: (row) => ({
    codigo: row.codigo,
    granjaId: row.granjaId,
    raza: row.raza,
    sexo: row.sexo,
    hembras: row.hembras,
    machos: row.machos,
    fechaAlojamiento: row.fechaAlojamiento ? formatDateInput(row.fechaAlojamiento) : todayInput(),
  }),
  load: async ({ accessToken, setData, setMeta }) => {
    const [lotsRes, farmsRes] = await Promise.all([
      api("lotes", { method: "GET", accessToken }),
      api("granjas", { method: "GET", accessToken }),
    ]);
    if (lotsRes.success) setData(lotsRes.data);
    if (farmsRes.success) setMeta({ farms: farmsRes.data });
  },
  canCreate: (meta) => (meta.farms?.length ?? 0) > 0,
  validate: (form, data, editing) => {
    const codigo = form.codigo.trim();
    if (!codigo) return "El código es obligatorio";
    if (!form.granjaId) return "Selecciona una granja";
    if (isDuplicateCode(data, codigo, editing?.id)) return "Ya existe un lote con ese código";
    if (form.hembras < 0 || form.machos < 0) return "Hembras y machos deben ser cero o mayor";
    if (!form.fechaAlojamiento) return "La fecha de alojamiento del lote es obligatoria";
    return "";
  },
  toPayload: (form) => ({ ...form, codigo: form.codigo.trim() }),
  buildColumns: ({ meta, openEdit, handleDelete }) => [
    { key: "codigo", header: "Código", render: (row) => row.codigo },
    {
      key: "fechaAlojamiento",
      header: "Fecha aloj.",
      render: (row) => (row.fechaAlojamiento ? formatDateShort(row.fechaAlojamiento) : "—"),
    },
    {
      key: "granja",
      header: "Granja",
      render: (row) => labelForId(meta.farms, row.granjaId, "nombre", "Sin granja"),
    },
    { key: "raza", header: "Raza", render: (row) => row.raza },
    { key: "sexo", header: "Sexo", render: (row) => <span className="capitalize">{row.sexo}</span> },
    { key: "etapa", header: "Etapa", render: (row) => <span className="capitalize font-semibold text-brand-600">{row.etapa || "levante"}</span> },
    {
      key: "edad",
      header: "Edad",
      align: "right",
      render: (row) => {
        const weeks =
          row.edadSemanas ??
          (row.fechaAlojamiento ? getAgeWeeks(row.fechaAlojamiento) : null);
        return (
          <span className="tabular-nums font-medium">
            {weeks != null ? `${weeks} sem` : "—"}
          </span>
        );
      },
    },
    { key: "estado", header: "Estado", render: (row) => <span className="capitalize">{row.estado}</span> },
    { key: "hembras", header: "Hembras", align: "right", render: (row) => row.hembras },
    { key: "machos", header: "Machos", align: "right", render: (row) => row.machos },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <RowActionsDropdown onEdit={() => openEdit(row)} onDelete={() => handleDelete(row.id)} />
      ),
    },
  ],
  getPrerequisiteEmpty: (meta) =>
    (meta.farms?.length ?? 0) === 0
      ? {
          icon: Layers,
          title: "Primero crea una granja",
          description: "Necesitas al menos una granja antes de registrar lotes.",
        }
      : null,
  getEmpty: () => ({
    icon: Layers,
    title: "Sin lotes",
    description: "Registra los lotes activos de tus granjas.",
    actionsLabel: "Crear lote",
  }),
  renderForm: ({ form, setForm, meta }) => (
    <div className="grid grid-cols-2 gap-4">
      <FormControl required>
        <Label>Código</Label>
        <Input
          value={form.codigo}
          placeholder="Ej. L-2026-014"
          onChange={(e) => setForm({ ...form, codigo: e.target.value })}
          autoFocus
        />
      </FormControl>
      <FormControl required>
        <Label>Granja</Label>
        <Select value={form.granjaId} onValueChange={(val) => setForm({ ...form, granjaId: val })}>
          {(meta.farms || []).map((farm) => (
            <option key={farm.id} value={farm.id}>
              {farm.nombre}
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl required>
        <Label>Raza</Label>
        <Select value={form.raza} onValueChange={(val) => setForm({ ...form, raza: val })}>
          <option value="COBB">COBB</option>
          <option value="ROSS">ROSS</option>
        </Select>
      </FormControl>
      <FormControl required>
        <Label>Sexo</Label>
        <Select value={form.sexo} onValueChange={(val) => setForm({ ...form, sexo: val })}>
          <option value="macho">Macho</option>
          <option value="hembra">Hembra</option>
          <option value="mixto">Mixto</option>
        </Select>
      </FormControl>
      <FormControl required className="col-span-2">
        <Label>Fecha de alojamiento del lote</Label>
        <DatePicker
          value={parseDateInput(form.fechaAlojamiento)}
          onChange={(date) => setForm({ ...form, fechaAlojamiento: formatDateInput(date) })}
        />
      </FormControl>
      <FormControl>
        <Label>Hembras recibidas</Label>
        <Input
          type="number"
          min="0"
          value={form.hembras}
          onChange={(e) => setForm({ ...form, hembras: Number(e.target.value) })}
          onFocus={(e) => e.target.select()}
        />
      </FormControl>
      <FormControl>
        <Label>Machos recibidos</Label>
        <Input
          type="number"
          min="0"
          value={form.machos}
          onChange={(e) => setForm({ ...form, machos: Number(e.target.value) })}
          onFocus={(e) => e.target.select()}
        />
      </FormControl>
    </div>
  ),
};

const placementInitialForm = {
  granjaId: "",
  loteId: "",
  galponId: "",
  hembras: 0,
  machos: 0,
  fechaAlojamiento: todayInput(),
  tipo: "levante",
  estado: "activo",
  mortalidadAlojamientoHembras: 0,
  mortalidadAlojamientoMachos: 0,
  cerrarDistribucion: false,
};

export const placementCatalogConfig = {
  resource: "alojamientos",
  loadError: "Error al cargar alojamientos",
  createLabel: "Nuevo alojamiento",
  createSuccess: "Alojamiento creado",
  updateSuccess: "Alojamiento actualizado",
  deleteTitle: "Eliminar alojamiento",
  deleteDescription: "¿Seguro que deseas eliminar este alojamiento?",
  deleteSuccess: "Alojamiento eliminado",
  modalTitles: { create: "Nuevo alojamiento", edit: "Editar alojamiento" },
  skeleton: { columns: 5, rows: 4 },
  initialForm: (meta) => ({
    ...placementInitialForm,
    granjaId: meta.farms?.[0]?.id || "",
    loteId: "",
    galponId: "",
  }),
  toForm: (row, meta) => {
    const lot = (meta?.lots || []).find((l) => normalizeId(l.id) === normalizeId(row.loteId));
    return {
      granjaId: lot?.granjaId || "",
      loteId: row.loteId,
      galponId: row.galponId,
      hembras: row.hembras,
      machos: row.machos,
      fechaAlojamiento: formatDateInput(row.fechaAlojamiento),
      tipo: row.tipo || "levante",
      estado: row.estado || "activo",
    };
  },
  toPayload: (form) => {
    const { granjaId, ...rest } = form;
    return rest;
  },
  load: async ({ accessToken, setData, setMeta }) => {
    const [placementsRes, farmsRes, lotsRes, shedsRes] = await Promise.all([
      api("alojamientos", { method: "GET", accessToken }),
      api("granjas", { method: "GET", accessToken }),
      api("lotes", { method: "GET", accessToken }),
      api("galpones", { method: "GET", accessToken }),
    ]);
    if (placementsRes.success) setData(placementsRes.data);
    setMeta({
      farms: farmsRes.success ? farmsRes.data : [],
      lots: lotsRes.success ? lotsRes.data : [],
      sheds: shedsRes.success ? shedsRes.data : [],
    });
  },
  canCreate: (meta) => (meta.lots?.length ?? 0) > 0 && (meta.sheds?.length ?? 0) > 0,
  validate: (form, data, editing) => {
    if (!form.loteId) return "Selecciona un lote";
    if (!form.galponId) return "Selecciona un galpón";
    if (!form.fechaAlojamiento) return "La fecha es obligatoria";
    if (form.hembras < 0 || form.machos < 0) return "Hembras y machos deben ser cero o mayor";
    if (isDuplicatePlacement(data, form, editing?.id)) {
      return "Ya existe un alojamiento para ese lote, galpón y fecha";
    }
    return "";
  },
  buildColumns: ({ meta, openEdit, handleDelete }) => [
    {
      key: "fechaAlojamiento",
      header: "Fecha",
      render: (row) => formatDateShort(row.fechaAlojamiento),
    },
    {
      key: "lote",
      header: "Lote",
      render: (row) => labelForId(meta.lots, row.loteId, "codigo", "Sin lote"),
    },
    {
      key: "galpon",
      header: "Galpón",
      render: (row) => labelForId(meta.sheds, row.galponId, "nombre", "Sin galpón"),
    },
    {
      key: "tipo",
      header: "Fase",
      render: (row) => <span className="capitalize font-medium">{row.tipo || "levante"}</span>
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => (
        <span className={`capitalize font-semibold ${row.estado === "cerrado" ? "text-zinc-400" : "text-emerald-600"}`}>
          {row.estado || "activo"}
        </span>
      )
    },
    { key: "hembras", header: "Hembras", align: "right", render: (row) => row.hembras },
    { key: "machos", header: "Machos", align: "right", render: (row) => row.machos },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <RowActionsDropdown onEdit={() => openEdit(row)} onDelete={() => handleDelete(row.id)} />
      ),
    },
  ],
  getPrerequisiteEmpty: (meta) =>
    (meta.lots?.length ?? 0) === 0 || (meta.sheds?.length ?? 0) === 0
      ? {
          icon: MapPin,
          title: "Faltan lotes o galpones",
          description: "Crea al menos un lote y un galpón antes de registrar alojamientos.",
        }
      : null,
  getEmpty: () => ({
    icon: MapPin,
    title: "Sin alojamientos",
    description: "Registra dónde y cuándo se alojó cada lote.",
    actionsLabel: "Crear alojamiento",
  }),
  renderForm: ({ form, setForm, meta, editing, accessToken }) => (
    <PlacementFormFields
      form={form}
      setForm={setForm}
      meta={meta}
      editing={editing}
      accessToken={accessToken}
    />
  ),
};

export const catalogConfigs = {
  granjas: farmCatalogConfig,
  complejos: complexCatalogConfig,
  lotes: lotCatalogConfig,
  alojamientos: placementCatalogConfig,
};
