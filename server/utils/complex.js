export function buildShedName(complejoNombre, numero) {
  return `${complejoNombre.trim()} ${numero}`;
}

export function parseShedName(nombre) {
  if (!nombre || typeof nombre !== "string") return null;

  const match = nombre.trim().match(/^(.+?)\s+([12])$/);
  if (!match) return null;

  return {
    complejoNombre: match[1].trim(),
    numero: Number(match[2]),
  };
}

export function serializeComplexRow(complex, sheds = []) {
  const sorted = [...sheds].sort((a, b) => (a.numero || 0) - (b.numero || 0));
  return {
    id: String(complex._id),
    _id: String(complex._id),
    granjaId: String(complex.granjaId),
    nombre: complex.nombre,
    active: complex.active !== false,
    galpones: sorted.map((shed) => ({
      id: String(shed._id),
      nombre: shed.nombre,
      numero: shed.numero,
      active: shed.active !== false,
    })),
  };
}
