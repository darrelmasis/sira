import RolePermission from "../models/RolePermission.js";
import { ALL_ROLES, DEFAULT_PERMISSIONS, PERMISSION_CATALOG } from "./permissions.defaults.js";

let permissionsMap = structuredClone(DEFAULT_PERMISSIONS);
let loaded = false;

function buildMapFromRows(rows) {
  const next = Object.fromEntries(Object.keys(PERMISSION_CATALOG).map((key) => [key, []]));

  for (const row of rows) {
    for (const permission of row.permissions || []) {
      if (!next[permission]) continue;
      if (!next[permission].includes(row.role)) {
        next[permission].push(row.role);
      }
    }
  }

  return next;
}

function buildRowsFromMap(map) {
  return ALL_ROLES.map((role) => ({
    role,
    permissions: Object.entries(map)
      .filter(([, roles]) => roles.includes(role))
      .map(([permission]) => permission),
  }));
}

export function getPermissionsMap() {
  return permissionsMap;
}

export function getPermissionCatalog() {
  return PERMISSION_CATALOG;
}

export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  return permissionsMap[permission]?.includes(role) ?? false;
}

export async function ensurePermissionsLoaded() {
  if (loaded) return permissionsMap;

  const rows = await RolePermission.find().lean();
  if (rows.length === 0) {
    await seedDefaultPermissions();
  } else {
    permissionsMap = buildMapFromRows(rows);
  }

  loaded = true;
  return permissionsMap;
}

export async function seedDefaultPermissions() {
  const rows = buildRowsFromMap(DEFAULT_PERMISSIONS);
  await RolePermission.deleteMany({});
  await RolePermission.insertMany(rows);
  permissionsMap = structuredClone(DEFAULT_PERMISSIONS);
  loaded = true;
  return permissionsMap;
}

export async function updateRolePermissions(role, permissions) {
  const allowed = new Set(Object.keys(PERMISSION_CATALOG));
  const nextPermissions = (permissions || []).filter((permission) => allowed.has(permission));

  await RolePermission.findOneAndUpdate(
    { role },
    { $set: { permissions: nextPermissions } },
    { upsert: true, new: true },
  );

  const rows = await RolePermission.find().lean();
  permissionsMap = buildMapFromRows(rows);
  return permissionsMap;
}

export function getRolePermissionsSnapshot() {
  return buildRowsFromMap(permissionsMap);
}
