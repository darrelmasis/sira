export const ROLES = {
  DESARROLLADOR: "desarrollador",
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  OPERADOR: "operador",
};

export const ALL_ROLES = Object.values(ROLES);

/** Catálogo de permisos disponibles en el sistema. */
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
};
