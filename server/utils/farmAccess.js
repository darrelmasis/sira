import mongoose from "mongoose";

export const GLOBAL_FARM_ACCESS_ROLES = ["desarrollador", "admin"];

export function hasGlobalFarmAccess(user) {
  return GLOBAL_FARM_ACCESS_ROLES.includes(user?.role);
}

export function getAssignedFarmIds(user) {
  return (user?.granjasAsignadas || []).map((id) => String(id));
}

export function canAccessFarm(user, granjaId) {
  if (!user) return false;
  if (hasGlobalFarmAccess(user)) return true;
  if (!granjaId) return false;
  return getAssignedFarmIds(user).includes(String(granjaId));
}

export function validateFarmAccess(user, granjaId) {
  if (hasGlobalFarmAccess(user)) return "";
  const assigned = getAssignedFarmIds(user);
  if (assigned.length === 0) return "No tienes granjas asignadas. Contacta al administrador.";
  if (!canAccessFarm(user, granjaId)) return "No tienes acceso a esta granja.";
  return "";
}

export function getFarmScopeFilter(user) {
  if (hasGlobalFarmAccess(user)) return null;
  const farmIds = user?.granjasAsignadas || [];
  if (farmIds.length === 0) return { _empty: true };
  return { $in: farmIds };
}

export async function buildCatalogFilter(resource, user, Lot) {
  const scope = getFarmScopeFilter(user);
  if (scope === null) return {};

  if (scope._empty) {
    return { _id: null };
  }

  if (resource === "granjas") {
    return { _id: scope };
  }

  if (resource === "galpones" || resource === "lotes") {
    return { granjaId: scope };
  }

  if (resource === "complejos") {
    return { granjaId: scope };
  }

  if (resource === "alojamientos") {
    const lotIds = await Lot.find({ granjaId: scope }).distinct("_id");
    if (lotIds.length === 0) return { _id: null };
    return { loteId: { $in: lotIds } };
  }

  return {};
}

export function normalizeFarmIds(rawIds) {
  if (!Array.isArray(rawIds)) return [];
  return rawIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}
