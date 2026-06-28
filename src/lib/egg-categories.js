export const EGG_CATEGORIES = [
  { id: "huevo-clase-a", nombre: "Huevo Clase A", clasificacion: "incubable" },
  { id: "huevo-clase-b", nombre: "Huevo Clase B", clasificacion: "incubable" },
  { id: "huevo-d-yema", nombre: "Huevo D/Yema", clasificacion: "comercial" },
  { id: "huevo-infertil", nombre: "Huevo Infértil", clasificacion: "comercial" },
  { id: "huevo-protocolo", nombre: "Huevo Protocolo", clasificacion: "comercial" },
  { id: "huevos-blancos", nombre: "Huevos Blancos", clasificacion: "comercial" },
  { id: "huevos-micro-fisurados", nombre: "Huevos Micro Fisurados", clasificacion: "comercial" },
  { id: "huevos-pequenos", nombre: "Huevos Pequeños", clasificacion: "comercial" },
  { id: "huevos-sucios", nombre: "Huevos Sucios", clasificacion: "comercial" },
  { id: "huevo-cascara-delgada", nombre: "Huevo Cascara Delgada", clasificacion: "descarte" },
  { id: "huevo-roto", nombre: "Huevo Roto", clasificacion: "descarte" },
];

export const CLASIFICACIONES = [
  { id: "incubable", nombre: "Incubable" },
  { id: "comercial", nombre: "Comercial" },
  { id: "descarte", nombre: "Descarte" },
];

export function getCategoriasPorClasificacion() {
  const map = {};
  for (const c of EGG_CATEGORIES) {
    if (!map[c.clasificacion]) map[c.clasificacion] = [];
    map[c.clasificacion].push(c);
  }
  return map;
}

export function getClasificacionLabel(id) {
  return CLASIFICACIONES.find((c) => c.id === id)?.nombre || id;
}
