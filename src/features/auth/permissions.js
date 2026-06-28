import { useMemo } from "react";
import { isSameCalendarDay, parseDateInput, todayInput } from "@/lib/datetime";
import { useAuth } from "./AuthContext";

export const ROLES = {
  DESARROLLADOR: "desarrollador",
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  OPERADOR: "operador",
};

export const ALL_ROLES = Object.values(ROLES);

export const PERMISSION_CATALOG = {
  "records.create": "Registrar actividades de campo",
  "records.edit": "Editar registros existentes",
  "records.delete": "Eliminar registros",
  "records.viewDetail": "Ver detalle de registros",
  "records.editAnyDate": "Registrar con fechas distintas a hoy",
  "records.view": "Ver registros e historial",
  "catalogs.manage": "Gestionar catálogos",
  "catalogs.view": "Ver catálogos offline",
  "users.manage": "Gestionar usuarios",
  "roles.manage": "Configurar permisos por rol",
  "sync.manual": "Sincronizar manualmente",
  "settings.view": "Ver ajustes",
  "transfers.create": "Realizar traslados y capitalizaciones",
  "inventory.view": "Ver inventario de aves",
};

export const DEFAULT_PERMISSIONS = {
  "records.create": [ROLES.DESARROLLADOR, ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR],
  "records.edit": [ROLES.DESARROLLADOR, ROLES.ADMIN],
  "records.delete": [ROLES.DESARROLLADOR, ROLES.ADMIN],
  "records.viewDetail": [ROLES.DESARROLLADOR, ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR],
  "records.editAnyDate": [ROLES.DESARROLLADOR, ROLES.ADMIN, ROLES.SUPERVISOR],
  "records.view": [ROLES.DESARROLLADOR, ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR],
  "catalogs.manage": [ROLES.DESARROLLADOR, ROLES.ADMIN],
  "catalogs.view": [ROLES.DESARROLLADOR, ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR],
  "users.manage": [ROLES.DESARROLLADOR],
  "roles.manage": [ROLES.DESARROLLADOR],
  "sync.manual": [ROLES.DESARROLLADOR, ROLES.ADMIN, ROLES.SUPERVISOR],
  "settings.view": [ROLES.DESARROLLADOR, ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR],
  "transfers.create": [ROLES.DESARROLLADOR, ROLES.ADMIN, ROLES.SUPERVISOR],
  "inventory.view": [ROLES.DESARROLLADOR, ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR],
};

let permissionsMap = structuredClone(DEFAULT_PERMISSIONS);

export function setPermissionsMap(map) {
  permissionsMap = map ? structuredClone(map) : structuredClone(DEFAULT_PERMISSIONS);
}

export function getPermissionsMap() {
  return permissionsMap;
}

const ROLE_LABELS = {
  [ROLES.DESARROLLADOR]: "Dev",
  [ROLES.ADMIN]: "Admin",
  [ROLES.SUPERVISOR]: "Supervisor",
  [ROLES.OPERADOR]: "Operario",
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || "Sin rol";
}

export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  return permissionsMap[permission]?.includes(role) ?? false;
}

export function canUseDate(role, date) {
  if (hasPermission(role, "records.editAnyDate")) return true;
  if (!date) return false;
  return isSameCalendarDay(date, todayInput());
}

export function getDateConstraints(role, permissionsMap = getPermissionsMap()) {
  if (permissionsMap["records.editAnyDate"]?.includes(role)) {
    return { minDate: undefined, maxDate: undefined };
  }

  const today = parseDateInput(todayInput());
  return { minDate: today, maxDate: today };
}

export function validateRecordDate(role, date) {
  if (canUseDate(role, date)) return "";
  return "Solo puedes registrar actividades del día de hoy.";
}

export function getRolePermissions(role) {
  return Object.entries(permissionsMap)
    .filter(([, roles]) => roles.includes(role))
    .map(([permission]) => permission);
}

export function usePermissions() {
  const { user, permissionsMap: map } = useAuth();
  const role = user?.role;

  return useMemo(
    () => ({
      role,
      roleLabel: getRoleLabel(role),
      can: (permission) => Boolean(role && map[permission]?.includes(role)),
      canUseDate: (date) => {
        if (role && map["records.editAnyDate"]?.includes(role)) return true;
        return canUseDate(role, date);
      },
      dateConstraints: getDateConstraints(role, map),
      validateRecordDate: (date) => {
        if (role && map["records.editAnyDate"]?.includes(role)) return "";
        return validateRecordDate(role, date);
      },
    }),
    [role, map],
  );
}
