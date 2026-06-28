import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Checkbox, EmptyStateTitle, toast } from "quickit-ui";
import PageSection from "@/components/layout/PageSection";
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
import TableSkeleton from "@/components/feedback/TableSkeleton";

export default function RolePermissionsPanel() {
  const { accessToken, applyPermissions } = useAuth();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(null);
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

  async function saveRole(role) {
    setSavingRole(role);
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
        throw new Error(response.message || "No se pudo guardar");
      }

      setRolePermissions(response.data.roles);
      applyPermissions(response.data.map);
      toast({ title: `Permisos de ${getRoleLabel(role)} actualizados`, kind: "success" });
    } catch (error) {
      toast({ title: error.message, kind: "error" });
      await loadPermissions();
    } finally {
      setSavingRole(null);
    }
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
    return <TableSkeleton columns={3} rows={4} showActionsColumn />;
  }

  return (
    <div className="space-y-4">
      <Alert
        color="info"
        title="Permisos por rol"
        description="Activa o desactiva permisos para cada rol. Los cambios aplican de inmediato para nuevas sesiones."
      />

      {ALL_ROLES.map((role) => (
        <PageSection key={role}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield aria-hidden="true" className="size-4 text-zinc-400" />
              <EmptyStateTitle className="text-base font-semibold">{getRoleLabel(role)}</EmptyStateTitle>
              <Badge variant="soft" color="neutral">
                {roleMap[role]?.length || 0} permisos
              </Badge>
            </div>
            <Button
              type="button"
              size="sm"
              color="brand"
              loading={savingRole === role}
              loadingText="Guardando..."
              onClick={() => saveRole(role)}
            >
              <Save aria-hidden="true" className="size-4" />
              Guardar rol
            </Button>
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
        </PageSection>
      ))}
    </div>
  );
}
