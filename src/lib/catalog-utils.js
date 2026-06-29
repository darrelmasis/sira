export function normalizeId(value) {
  if (value == null || value === "") return "";
  return String(value);
}

export function findById(items, id) {
  const target = normalizeId(id);
  if (!target) return null;
  return items.find((item) => normalizeId(item.id || item._id) === target) || null;
}

export function buildNameMap(items, labelKey = "nombre") {
  return Object.fromEntries(
    (items || []).map((item) => [normalizeId(item.id || item._id), item[labelKey]]),
  );
}

export function labelForId(items, id, labelKey = "nombre", fallback = "—") {
  const item = findById(items, id);
  return item?.[labelKey] || fallback;
}

export function isDuplicateName(items, name, excludeId = null) {
  const normalized = name.trim().toLowerCase();
  return items.some((item) => {
    if (excludeId && normalizeId(item.id) === normalizeId(excludeId)) return false;
    return item.nombre?.trim().toLowerCase() === normalized;
  });
}

export function isDuplicateCode(items, code, excludeId = null) {
  const normalized = code.trim().toLowerCase();
  return items.some((item) => {
    if (excludeId && normalizeId(item.id) === normalizeId(excludeId)) return false;
    return item.codigo?.trim().toLowerCase() === normalized;
  });
}

export function isDuplicateComplex(items, { nombre, granjaId }, excludeId = null) {
  const normalized = nombre.trim().toLowerCase();
  const farmId = normalizeId(granjaId);
  return items.some((item) => {
    if (excludeId && normalizeId(item.id) === normalizeId(excludeId)) return false;
    return normalizeId(item.granjaId) === farmId && item.nombre?.trim().toLowerCase() === normalized;
  });
}

export function isDuplicateShed(items, { nombre, granjaId }, excludeId = null) {
  const normalized = nombre.trim().toLowerCase();
  const farmId = normalizeId(granjaId);
  return items.some((item) => {
    if (excludeId && normalizeId(item.id) === normalizeId(excludeId)) return false;
    return normalizeId(item.granjaId) === farmId && item.nombre?.trim().toLowerCase() === normalized;
  });
}

export function isDuplicatePlacement(items, { loteId, galponId, fechaAlojamiento }, excludeId = null) {
  const lot = normalizeId(loteId);
  const shed = normalizeId(galponId);
  const date = fechaAlojamiento?.slice(0, 10);
  return items.some((item) => {
    if (excludeId && normalizeId(item.id) === normalizeId(excludeId)) return false;
    return (
      normalizeId(item.loteId) === lot &&
      normalizeId(item.galponId) === shed &&
      String(item.fechaAlojamiento).slice(0, 10) === date
    );
  });
}
