import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DataTable,
  FormControl,
  FormDescription,
  Input,
  Label,
  Select,
  Tabs,
  toast,
} from "quickit-ui";
import { Plus, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { getRoleLabel, ROLES } from "@/features/auth/permissions";
import { hasGlobalFarmAccess } from "@/features/auth/farmAccess";
import { useAuth } from "@/features/auth/AuthContext";
import { usePermissions } from "@/features/auth/permissions";
import UserAvatar from "@/components/UserAvatar";
import RolePermissionsPanel from "@/features/users/RolePermissionsPanel";
import PageTable from "@/components/data/PageTable";
import AppModal from "@/components/ui/AppModal";
import RowActionsDropdown from "@/components/ui/RowActionsDropdown";
import { formatDateTime } from "@/lib/datetime";

const roleOptions = Object.values(ROLES);

const emptyForm = {
  username: "",
  password: "",
  nombre: "",
  email: "",
  role: ROLES.OPERADOR,
  active: true,
  granjasAsignadas: [],
};

export default function UsersPage() {
  const { accessToken } = useAuth();
  const { can } = usePermissions();
  const canManageUsers = can("users.manage");
  const canManageRoles = can("roles.manage");
  const defaultTab = canManageUsers ? "usuarios" : "permisos";

  const [users, setUsers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loadError, setLoadError] = useState("");

  const farmMap = useMemo(
    () => Object.fromEntries(farms.map((farm) => [String(farm.id), farm.nombre])),
    [farms],
  );

  async function loadData() {
    if (!accessToken || !canManageUsers) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const [usersRes, farmsRes] = await Promise.all([
        api("usuarios", { method: "GET", accessToken }),
        api("granjas", { method: "GET", accessToken }),
      ]);

      if (!usersRes.success) {
        throw new Error(usersRes.message || "No se pudieron cargar los usuarios");
      }

      if (!farmsRes.success) {
        throw new Error(farmsRes.message || "No se pudieron cargar las granjas");
      }

      setUsers(usersRes.data);
      setFarms(farmsRes.data);
    } catch (error) {
      setLoadError(error.message);
      toast({ title: error.message, kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [accessToken, canManageUsers]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      username: row.username,
      password: "",
      nombre: row.nombre,
      email: row.email,
      role: row.role,
      active: row.active,
      granjasAsignadas: row.granjasAsignadas || [],
    });
    setModalOpen(true);
  }

  function setFarmChecked(farmId, checked) {
    const id = String(farmId);
    setForm((current) => {
      const set = new Set(current.granjasAsignadas.map(String));
      if (checked) set.add(id);
      else set.delete(id);
      return { ...current, granjasAsignadas: Array.from(set) };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      if (!form.nombre.trim()) throw new Error("El nombre es obligatorio");
      if (!form.email.trim()) throw new Error("El email es obligatorio");
      if (!editing && !form.username.trim()) throw new Error("El usuario es obligatorio");

      const body = {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        role: form.role,
        active: form.active,
        granjasAsignadas: hasGlobalFarmAccess({ role: form.role }) ? [] : form.granjasAsignadas,
      };

      if (editing) {
        body.id = editing.id;
        if (form.username.trim()) body.username = form.username.trim();
        if (form.password) body.password = form.password;
      } else {
        if (!form.password || form.password.length < 8) {
          throw new Error("La contraseña debe tener al menos 8 caracteres");
        }
        body.username = form.username.trim();
        body.password = form.password;
      }

      const response = await api("usuarios", {
        method: editing ? "PUT" : "POST",
        accessToken,
        body: JSON.stringify(body),
      });

      if (!response.success) {
        throw new Error(response.message || "No se pudo guardar");
      }

      toast({ title: editing ? "Usuario actualizado" : "Usuario creado", kind: "success" });
      setModalOpen(false);
      await loadData();
    } catch (error) {
      toast({ title: error.message, kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo(
    () => [
      { key: "nombre", header: "Nombre", render: (row) => (
          <div className="flex items-center gap-2">
            <UserAvatar user={row} size="sm" />
            <span>{row.nombre}</span>
          </div>
        ) },
      { key: "email", header: "Email", render: (row) => row.email || "—" },
      {
        key: "role",
        header: "Rol",
        render: (row) => (
          <Badge color="neutral" variant="soft">
            {getRoleLabel(row.role)}
          </Badge>
        ),
      },
      {
        key: "granjas",
        header: "Granjas asignadas",
        render: (row) => {
          if (hasGlobalFarmAccess(row)) {
            return <span className="text-sm text-zinc-500">Todas las granjas</span>;
          }
          if (!row.granjasAsignadas?.length) {
            return <span className="text-sm text-warning-600">Sin granjas</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {row.granjasAsignadas.map((farmId) => (
                <Badge key={farmId} color="brand" variant="soft">
                  {farmMap[farmId] || farmId}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        key: "registro",
        header: "Registro",
        render: (row) => formatDateTime(row.createdAt),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (row) => (
          <RowActionsDropdown onEdit={() => openEdit(row)} />
        ),
      },
    ],
    [farmMap],
  );

  const formHasGlobalAccess = hasGlobalFarmAccess({ role: form.role });

  return (
    <div className="space-y-4">
      <Tabs defaultValue={defaultTab} color="brand">
        <Tabs.List>
          {canManageUsers && <Tabs.Trigger value="usuarios">Usuarios</Tabs.Trigger>}
          {canManageRoles && <Tabs.Trigger value="permisos">Permisos por rol</Tabs.Trigger>}
        </Tabs.List>

        {canManageUsers && (
          <Tabs.Content value="usuarios" className="space-y-4 pt-4">
            {/* <Alert
              color="info"
              title="Acceso por granja"
              description="Asigna granjas a cada usuario para limitar qué lotes, galpones y registros puede ver y capturar."
            /> */}

            {loadError && <Alert color="danger" title={loadError} />}

            <div className="flex justify-end">
              <Button type="button" size="md" color="brand" onClick={openCreate}>
                <UserPlus aria-hidden="true" className="size-4" />
                Agregar usuario
              </Button>
            </div>

            <PageTable
              columns={columns}
              data={users}
              rowKey={(row) => row.id}
              loading={loading}
              stickyHeader
              color="neutral"
              limit={25}
              skeletonRows={5}
              emptyIcon={Users}
              emptyTitle="Sin usuarios"
              emptyDescription="Agrega el primer usuario para empezar a asignar roles y granjas."
              emptyActions={
                <Button type="button" color="brand" onClick={openCreate}>
                  <UserPlus aria-hidden="true" className="size-4" />
                  Agregar usuario
                </Button>
              }
            />

            <AppModal open={modalOpen} onOpenChange={setModalOpen} size="lg">
              <AppModal.Content>
                <AppModal.Form onSubmit={handleSubmit}>
                  <AppModal.Header>
                    <AppModal.Title>{editing ? "Editar usuario" : "Nuevo usuario"}</AppModal.Title>
                    <FormDescription>
                      {editing
                        ? "Actualiza rol, acceso a granjas o credenciales."
                        : "Crea un usuario con acceso limitado por granja."}
                    </FormDescription>
                  </AppModal.Header>

                  <AppModal.Body className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormControl controlId="nombre" required>
                        <Label>Nombre</Label>
                        <Input
                          value={form.nombre}
                          placeholder="Ej. Juan Pérez"
                          onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                        />
                      </FormControl>

                      <FormControl controlId="email" required>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={form.email}
                          placeholder="usuario@empresa.com"
                          onChange={(event) => setForm({ ...form, email: event.target.value })}
                        />
                      </FormControl>

                      <FormControl controlId="username" required={!editing}>
                        <Label>Usuario</Label>
                        <Input
                          value={form.username}
                          placeholder="Ej. jperez"
                          onChange={(event) => setForm({ ...form, username: event.target.value })}
                        />
                      </FormControl>

                      <FormControl controlId="password" required={!editing}>
                        <Label>{editing ? "Nueva contraseña" : "Contraseña"}</Label>
                        <Input
                          type="password"
                          passwordToggle
                          value={form.password}
                          placeholder={editing ? "Dejar vacío para no cambiar" : "Mínimo 8 caracteres"}
                          onChange={(event) => setForm({ ...form, password: event.target.value })}
                        />
                      </FormControl>

                      <FormControl controlId="role" required>
                        <Label>Rol</Label>
                        <Select
                          value={form.role}
                          placeholder="Seleccionar rol"
                          onValueChange={(value) => setForm({ ...form, role: value, granjasAsignadas: [] })}
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {getRoleLabel(role)}
                            </option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl controlId="active">
                        <Label>Estado</Label>
                        <Select
                          value={form.active ? "activo" : "inactivo"}
                          onValueChange={(value) => setForm({ ...form, active: value === "activo" })}
                        >
                          <option value="activo">Activo</option>
                          <option value="inactivo">Inactivo</option>
                        </Select>
                      </FormControl>
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-[var(--sira-surface)] p-4 dark:border-zinc-800">
                      <Label className="mb-3 block">Granjas asignadas</Label>
                      {formHasGlobalAccess ? (
                        <FormDescription>
                          Los roles {getRoleLabel(ROLES.DESARROLLADOR)} y {getRoleLabel(ROLES.ADMIN)} tienen acceso a
                          todas las granjas.
                        </FormDescription>
                      ) : farms.length === 0 ? (
                        <Alert color="warning" title="No hay granjas disponibles. Crea granjas en Catálogos primero." />
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {farms.map((farm) => (
                            <Checkbox
                              key={farm.id}
                              label={farm.nombre}
                              checked={form.granjasAsignadas.map(String).includes(String(farm.id))}
                              onCheckedChange={(checked) => setFarmChecked(farm.id, checked)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </AppModal.Body>

                  <AppModal.Actions>
                    <AppModal.Action type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                      Cancelar
                    </AppModal.Action>
                    <AppModal.Action type="submit" loading={saving} loadingText="Guardando...">
                      <Plus aria-hidden="true" className="size-4" />
                      Guardar
                    </AppModal.Action>
                  </AppModal.Actions>
                </AppModal.Form>
              </AppModal.Content>
            </AppModal>
          </Tabs.Content>
        )}

        {canManageRoles && (
          <Tabs.Content value="permisos" className="pt-4">
            <RolePermissionsPanel />
          </Tabs.Content>
        )}
      </Tabs>
    </div>
  );
}
