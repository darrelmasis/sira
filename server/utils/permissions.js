import dayjs from "dayjs";
import { hasPermission as checkPermission, getPermissionsMap } from "./permissionRegistry.js";

export { ROLES, ALL_ROLES, DEFAULT_PERMISSIONS, PERMISSION_CATALOG } from "./permissions.defaults.js";
export {
  ensurePermissionsLoaded,
  getPermissionsMap,
  getPermissionCatalog,
  getRolePermissionsSnapshot,
  seedDefaultPermissions,
  updateRolePermissions,
} from "./permissionRegistry.js";

export function hasPermission(role, permission) {
  return checkPermission(role, permission);
}

export function canUseDate(role, date) {
  if (hasPermission(role, "records.editAnyDate")) return true;
  if (!date) return false;
  return dayjs(date).startOf("day").isSame(dayjs().startOf("day"));
}

export function validateRecordDate(role, date) {
  if (canUseDate(role, date)) return "";
  return "Solo puedes registrar actividades del día de hoy.";
}

export function requirePermission(user, permission) {
  if (!user || !hasPermission(user.role, permission)) {
    return `Permiso denegado: ${permission}`;
  }
  return "";
}
