import { FormControl, Input, Label, Select, DatePicker } from "quickit-ui";
import { Building2, Home, Layers, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import {
  isDuplicateCode,
  isDuplicateName,
  isDuplicatePlacement,
  isDuplicateShed,
  labelForId,
  normalizeId,
} from "@/lib/catalog-utils";
import { formatDateInput, formatDateShort, parseDateInput, todayInput } from "@/lib/datetime";
import RowActionsDropdown from "@/components/ui/RowActionsDropdown";

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
    description: "Crea la primera granja para empezar a configurar galpones y lotes.",
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

export const shedCatalogConfig = {
  resource: "galpones",
  loadError: "Error al cargar galpones",
  createLabel: "Nuevo galpón",
  createSuccess: "Galpón creado",
  updateSuccess: "Galpón actualizado",
  deleteTitle: "Eliminar galpón",
  deleteDescription: "Esta acción no se puede deshacer.",
  deleteSuccess: "Galpón eliminado",
  modalTitles: { create: "Nuevo galpón", edit: "Editar galpón" },
  skeleton: { columns: 2, rows: 4 },
  initialForm: (meta) => ({ nombre: "", granjaId: meta.farms?.[0]?.id || "" }),
  toForm: (row) => ({ nombre: row.nombre, granjaId: row.granjaId }),
  load: async ({ accessToken, setData, setMeta }) => {
    const [shedsRes, farmsRes] = await Promise.all([
      api("galpones", { method: "GET", accessToken }),
      api("granjas", { method: "GET", accessToken }),
    ]);
    if (shedsRes.success) setData(shedsRes.data);
    if (farmsRes.success) setMeta({ farms: farmsRes.data });
  },
  canCreate: (meta) => (meta.farms?.length ?? 0) > 0,
  validate: (form, data, editing) => {
    const nombre = form.nombre.trim();
    if (!nombre) return "El nombre es obligatorio";
    if (!form.granjaId) return "Selecciona una granja";
    if (isDuplicateShed(data, { nombre, granjaId: form.granjaId }, editing?.id)) {
      return "Ya existe ese galpón en la granja";
    }
    return "";
  },
  toPayload: (form) => ({ ...form, nombre: form.nombre.trim() }),
  buildColumns: ({ meta, openEdit, handleDelete }) => [
    { key: "nombre", header: "Nombre", render: (row) => row.nombre },
    {
      key: "granja",
      header: "Granja",
      render: (row) => labelForId(meta.farms, row.granjaId, "nombre", "Sin granja"),
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
          icon: Home,
          title: "Primero crea una granja",
          description: "Necesitas al menos una granja antes de registrar galpones.",
        }
      : null,
  getEmpty: () => ({
    icon: Home,
    title: "Sin galpones",
    description: "Agrega galpones a tus granjas.",
    actionsLabel: "Crear galpón",
  }),
  renderForm: ({ form, setForm, meta }) => (
    <>
      <FormControl required>
        <Label>Nombre</Label>
        <Input
          value={form.nombre}
          placeholder="Ej. Galpón 01"
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
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
    </>
  ),
};

const lotInitialForm = {
  codigo: "",
  granjaId: "",
  raza: "COBB",
  sexo: "mixto",
  estado: "activo",
  hembras: 0,
  machos: 0,
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
  skeleton: { columns: 6, rows: 5 },
  initialForm: (meta) => ({ ...lotInitialForm, granjaId: meta.farms?.[0]?.id || "" }),
  toForm: (row) => ({
    codigo: row.codigo,
    granjaId: row.granjaId,
    raza: row.raza,
    sexo: row.sexo,
    estado: row.estado,
    hembras: row.hembras,
    machos: row.machos,
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
    return "";
  },
  toPayload: (form) => ({ ...form, codigo: form.codigo.trim() }),
  buildColumns: ({ meta, openEdit, handleDelete }) => [
    { key: "codigo", header: "Código", render: (row) => row.codigo },
    {
      key: "granja",
      header: "Granja",
      render: (row) => labelForId(meta.farms, row.granjaId, "nombre", "Sin granja"),
    },
    { key: "raza", header: "Raza", render: (row) => row.raza },
    { key: "sexo", header: "Sexo", render: (row) => <span className="capitalize">{row.sexo}</span> },
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
      <FormControl>
        <Label>Hembras</Label>
        <Input
          type="number"
          min="0"
          value={form.hembras}
          onChange={(e) => setForm({ ...form, hembras: Number(e.target.value) })}
          onFocus={(e) => e.target.select()}
        />
      </FormControl>
      <FormControl>
        <Label>Machos</Label>
        <Input
          type="number"
          min="0"
          value={form.machos}
          onChange={(e) => setForm({ ...form, machos: Number(e.target.value) })}
          onFocus={(e) => e.target.select()}
        />
      </FormControl>
      <FormControl required className="col-span-2">
        <Label>Estado</Label>
        <Select value={form.estado} onValueChange={(val) => setForm({ ...form, estado: val })}>
          <option value="activo">Activo</option>
          <option value="cerrado">Cerrado</option>
        </Select>
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
  renderForm: ({ form, setForm, meta }) => {
    const farms = meta.farms || [];
    const allLots = meta.lots || [];
    const allSheds = meta.sheds || [];

    const filteredLots = form.granjaId
      ? allLots.filter((l) => normalizeId(l.granjaId) === normalizeId(form.granjaId))
      : allLots;

    const filteredSheds = form.granjaId
      ? allSheds.filter((s) => normalizeId(s.granjaId) === normalizeId(form.granjaId))
      : allSheds;

    return (
      <div className="grid grid-cols-2 gap-4">
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
                {lot.codigo}
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
        <FormControl>
          <Label>Hembras</Label>
          <Input
            type="number"
            min="0"
            value={form.hembras}
            onChange={(e) => setForm({ ...form, hembras: Number(e.target.value) })}
            onFocus={(e) => e.target.select()}
          />
        </FormControl>
        <FormControl>
          <Label>Machos</Label>
          <Input
            type="number"
            min="0"
            value={form.machos}
            onChange={(e) => setForm({ ...form, machos: Number(e.target.value) })}
            onFocus={(e) => e.target.select()}
          />
        </FormControl>
      </div>
    );
  },
};

export const catalogConfigs = {
  granjas: farmCatalogConfig,
  galpones: shedCatalogConfig,
  lotes: lotCatalogConfig,
  alojamientos: placementCatalogConfig,
};
