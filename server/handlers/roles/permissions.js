import { requireAuth } from "../../middleware/auth.js";
import {
  ensurePermissionsLoaded,
  getPermissionCatalog,
  getPermissionsMap,
  getRolePermissionsSnapshot,
  hasPermission,
  updateRolePermissions,
} from "../../utils/permissions.js";
import { ALL_ROLES } from "../../utils/permissions.defaults.js";
import { failure, success } from "../../utils/response.js";

export default async function rolePermissionsHandler(req, res) {
  await ensurePermissionsLoaded();

  const user = await requireAuth(req, res);
  if (!user) return null;

  if (req.method === "GET") {
    return success(res, {
      map: getPermissionsMap(),
      catalog: getPermissionCatalog(),
      roles: getRolePermissionsSnapshot(),
    });
  }

  if (req.method === "PUT") {
    if (!hasPermission(user.role, "roles.manage")) {
      return failure(res, "Permiso denegado", 403);
    }

    const { role, permissions } = req.body || {};

    if (!role || !ALL_ROLES.includes(role)) {
      return failure(res, "Rol inválido", 400);
    }

    if (!Array.isArray(permissions)) {
      return failure(res, "Permisos inválidos", 400);
    }

    if (role === "desarrollador" && !permissions.includes("roles.manage")) {
      return failure(res, "El rol desarrollador debe conservar roles.manage", 400);
    }

    await updateRolePermissions(role, permissions);

    return success(res, {
      map: getPermissionsMap(),
      roles: getRolePermissionsSnapshot(),
    });
  }

  return failure(res, "Método no soportado", 405);
}
