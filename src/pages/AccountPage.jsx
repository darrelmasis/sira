import { useEffect, useState } from "react";
import { Alert, Badge, Button, FormControl, Input, Label, Tabs, toast, useQuickitThemeController } from "quickit-ui";
import { KeyRound, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import AvatarPicker from "@/features/profile/AvatarPicker";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/features/auth/AuthContext";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { usePermissions } from "@/features/auth/permissions";
import { getLocalCatalogs } from "@/features/catalogs/catalogStore";

const themeOptions = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
];

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, logout, accessToken } = useAuth();
  const { roleLabel } = usePermissions();
  const { hasGlobalFarmAccess, assignedFarmIds } = useFarmAccess();
  const { theme, setTheme } = useQuickitThemeController();
  const [assignedFarmNames, setAssignedFarmNames] = useState([]);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    getLocalCatalogs().then(({ farms }) => {
      if (hasGlobalFarmAccess) {
        setAssignedFarmNames(["Todas las granjas"]);
        return;
      }
      const names = farms
        .filter((farm) => assignedFarmIds.includes(String(farm.id)))
        .map((farm) => farm.nombre);
      setAssignedFarmNames(names.length > 0 ? names : ["Sin granjas asignadas"]);
    });
  }, [hasGlobalFarmAccess, assignedFarmIds]);

  async function handleChangePassword(event) {
    event.preventDefault();
    setPasswordError("");

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError("Completa todos los campos.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await api("auth/change-password", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!response.success) {
        throw new Error(response.message || "No se pudo cambiar la contraseña");
      }

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Contraseña actualizada", kind: "success" });
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Tabs defaultValue="cuenta">
        <Tabs.List>
          <Tabs.Trigger value="cuenta">Cuenta</Tabs.Trigger>
          <Tabs.Trigger value="tema">Tema</Tabs.Trigger>
          <Tabs.Trigger value="seguridad">Seguridad</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="cuenta" className="mt-6 space-y-6">
          <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <UserAvatar user={user} size="xl" className="shrink-0" />
              <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
                <FormControl controlId="account-nombre">
                  <Label>Nombre</Label>
                  <Input id="account-nombre" value={user?.nombre || "N/D"} readOnly />
                </FormControl>

                <FormControl controlId="account-username">
                  <Label>Usuario</Label>
                  <Input id="account-username" value={`@${user?.username || "N/D"}`} readOnly />
                </FormControl>

                <FormControl controlId="account-email">
                  <Label>Email</Label>
                  <Input id="account-email" value={user?.email || "N/D"} readOnly />
                </FormControl>

                <FormControl controlId="account-rol">
                  <Label>Rol</Label>
                  <Input id="account-rol" value={roleLabel} readOnly />
                </FormControl>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold">Granjas asignadas</h2>
            <div className="flex flex-wrap gap-1">
              {assignedFarmNames.map((name) => (
                <Badge key={name} color="brand" variant="soft">
                  {name}
                </Badge>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold">Avatar</h2>
            <AvatarPicker />
          </section>
        </Tabs.Content>

        <Tabs.Content value="tema" className="mt-6">
          <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold">Apariencia</h2>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Selecciona el tema de la aplicación.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={theme === option.value ? "solid" : "outline"}
                    color="neutral"
                    onClick={() => setTheme(option.value)}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </section>
        </Tabs.Content>

        <Tabs.Content value="seguridad" className="mt-6 space-y-6">
          <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
            <h2 className="mb-1 text-sm font-semibold">Cambiar contraseña</h2>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Actualiza tu contraseña de acceso.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && <Alert color="danger" title={passwordError} />}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormControl controlId="currentPassword" required>
                  <Label>Contraseña actual</Label>
                  <Input
                    type="password"
                    passwordToggle
                    placeholder="Contraseña actual"
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                  />
                </FormControl>

                <FormControl controlId="newPassword" required>
                  <Label>Nueva contraseña</Label>
                  <Input
                    type="password"
                    passwordToggle
                    placeholder="Mínimo 8 caracteres"
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                  />
                </FormControl>
              </div>

              <FormControl controlId="confirmPassword" required>
                <Label>Confirmar contraseña</Label>
                <Input
                  type="password"
                  passwordToggle
                  placeholder="Repite la nueva contraseña"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                />
              </FormControl>

              <Button type="submit" color="brand" loading={changingPassword} loadingText="Guardando...">
                <KeyRound aria-hidden="true" className="size-4" />
                Cambiar contraseña
              </Button>
            </form>
          </section>

          <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold">Sesión</h2>
            <Button type="button" color="danger" variant="outline" onClick={handleLogout}>
              <LogOut aria-hidden="true" className="size-4" />
              Cerrar sesión
            </Button>
          </section>
        </Tabs.Content>
      </Tabs>
    </div>
  );
}
