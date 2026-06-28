import { useMemo } from "react";
import { useAuth } from "./AuthContext";

export const GLOBAL_FARM_ACCESS_ROLES = ["desarrollador", "admin"];

export function hasGlobalFarmAccess(userOrRole) {
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  return GLOBAL_FARM_ACCESS_ROLES.includes(role);
}

export function getAssignedFarmIds(user) {
  return (user?.granjasAsignadas || []).map(String);
}

export function canAccessFarm(user, granjaId) {
  if (!user) return false;
  if (hasGlobalFarmAccess(user)) return true;
  if (!granjaId) return false;
  return getAssignedFarmIds(user).includes(String(granjaId));
}

export function filterCatalogsByUser(catalogs, user) {
  if (!catalogs) {
    return { farms: [], sheds: [], lots: [], placements: [] };
  }

  if (hasGlobalFarmAccess(user)) {
    return catalogs;
  }

  const allowed = new Set(getAssignedFarmIds(user));
  const farms = catalogs.farms.filter((farm) => allowed.has(String(farm.id)));
  const farmIds = new Set(farms.map((farm) => String(farm.id)));
  const sheds = catalogs.sheds.filter((shed) => farmIds.has(String(shed.granjaId)));
  const lots = catalogs.lots.filter((lot) => farmIds.has(String(lot.granjaId)));
  const lotIds = new Set(lots.map((lot) => String(lot.id)));
  const placements = catalogs.placements.filter((placement) => lotIds.has(String(placement.loteId)));

  return { farms, sheds, lots, placements };
}

export function filterRecordsByUser(records, user) {
  if (!Array.isArray(records)) return [];
  if (hasGlobalFarmAccess(user)) return records;

  const allowed = new Set(getAssignedFarmIds(user));
  return records.filter((record) => allowed.has(String(record.payload?.granjaId)));
}

export function useFarmAccess() {
  const { user } = useAuth();

  return useMemo(
    () => ({
      user,
      hasGlobalFarmAccess: hasGlobalFarmAccess(user),
      assignedFarmIds: getAssignedFarmIds(user),
      canAccessFarm: (granjaId) => canAccessFarm(user, granjaId),
      filterCatalogs: (catalogs) => filterCatalogsByUser(catalogs, user),
      filterRecords: (records) => filterRecordsByUser(records, user),
      hasAssignedFarms: hasGlobalFarmAccess(user) || getAssignedFarmIds(user).length > 0,
    }),
    [user],
  );
}
