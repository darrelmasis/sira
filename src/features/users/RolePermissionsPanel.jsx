import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Checkbox, EmptyStateTitle, Tabs, toast } from "quickit-ui";
import { Save, Shield } from "lucide-react";
import { api } from "@/lib/api";
import {
  ALL_ROLES,
  getRoleLabel,
  PERMISSION_CATALOG,
  ROLES,
} from "@/features/auth/permissions";
import { useAuth } from "@/features/auth/AuthContext";
import { usePermissions } from "@/features/auth/permissions";

export default function RolePermissionsPanel() {
  const { accessToken, applyPermissions } = useAuth();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rolePermissions, setRolePermissions] = useState([]);

  const roleMap = useMemo(
    () => Object.fromEntries(rolePermissions.map((row) => [row.role, row.permissions])),
    [rolePermissions],
  );

  async function loadPermissions() {
    if (!accessToken) return;

    setLoading(true);
    try {
      const response = await api("roles/permissions", {
        method: "GET",
        accessToken,
      });

      if (!response.success) {
        throw new Error(response.message || "No se pudieron cargar los permisos");
      }

      setRolePermissions(response.data.roles);
      applyPermissions(response.data.map);
    } catch (error) {
      toast({ title: error.message, kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPermissions();
  }, [accessToken]);

  function togglePermission(role, permission) {
    setRolePermissions((current) =>
      current.map((row) => {
        if (row.role !== role) return row;
        const set = new Set(row.permissions);
        if (set.has(permission)) set.delete(permission);
        else set.add(permission);
        return { ...row, permissions: Array.from(set) };
      }),
    );
  }

  async function saveAllRoles() {
    setSaving(true);
    const errors = [];
    for (const role of ALL_ROLES) {
      try {
        const row = rolePermissions.find((item) => item.role === role);
        const response = await api("roles/permissions", {
          method: "PUT",
          accessToken,
          body: JSON.stringify({
            role,
            permissions: row?.permissions || [],
          }),
        });

        if (!response.success) {
          throw new Error(response.message || `Error en ${getRoleLabel(role)}`);
        }

        setRolePermissions(response.data.roles);
        applyPermissions(response.data.map);
      } catch (error) {
        errors.push(error.message);
      }
    }

    if (errors.length === 0) {
      toast({ title: "Permisos actualizados", kind: "success" });
    } else {
      toast({ title: errors.join(", "), kind: "error" });
      await loadPermissions();
    }
    setSaving(false);
  }

  if (!can("roles.manage")) {
    return (
      <Alert
        color="warning"
        title="Sin acceso"
        description="Necesitas el permiso roles.manage para configurar permisos por rol."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
        Cargando permisos...
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <Tabs defaultValue={ALL_ROLES[0]} color="brand">
        <div className="flex items-center justify-between gap-4">
          <Tabs.List>
            {ALL_ROLES.map((role) => (
              <Tabs.Trigger key={role} value={role}>
                {getRoleLabel(role)}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Button
            type="button"
            size="sm"
            color="brand"
            loading={saving}
            loadingText="Guardando..."
            onClick={saveAllRoles}
          >
            <Save aria-hidden="true" className="size-4" />
            Guardar
          </Button>
        </div>

        {ALL_ROLES.map((role) => (
          <Tabs.Content key={role} value={role} className="pt-4">
            <div className="mb-4 flex items-center gap-2">
              <Shield aria-hidden="true" className="size-4 text-zinc-400" />
              <EmptyStateTitle className="text-base font-semibold">{getRoleLabel(role)}</EmptyStateTitle>
              <Badge variant="soft" color="neutral">
                {roleMap[role]?.length || 0} permisos
              </Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(PERMISSION_CATALOG).map(([permission, label]) => {
                const checked = roleMap[role]?.includes(permission) ?? false;
                const locked = role === ROLES.DESARROLLADOR && permission === "roles.manage";

                return (
                  <Checkbox
                    key={permission}
                    label={label}
                    checked={checked}
                    disabled={locked}
                    onCheckedChange={() => !locked && togglePermission(role, permission)}
                  />
                );
              })}
            </div>
          </Tabs.Content>
        ))}
      </Tabs>
    </div>
  );
}
