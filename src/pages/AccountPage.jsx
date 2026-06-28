import { useEffect, useState } from "react";
import { Alert, Badge, Button, FormControl, Input, Label, toast } from "quickit-ui";
import { KeyRound, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import AvatarPicker from "@/features/profile/AvatarPicker";
import UserAvatar from "@/components/UserAvatar";
import PageSection from "@/components/layout/PageSection";
import { useAuth } from "@/features/auth/AuthContext";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { usePermissions } from "@/features/auth/permissions";
import { getLocalCatalogs } from "@/features/catalogs/catalogStore";

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, logout, accessToken } = useAuth();
  const { roleLabel } = usePermissions();
  const { hasGlobalFarmAccess, assignedFarmIds } = useFarmAccess();
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
    <div className="mx-auto max-w-2xl space-y-6">
      <PageSection title="Perfil">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <UserAvatar user={user} size="xl" className="shrink-0" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-zinc-500">Nombre</span>
                <p className="font-medium">{user?.nombre || "N/D"}</p>
              </div>
              <div>
                <span className="text-zinc-500">Usuario</span>
                <p className="font-medium">@{user?.username || "N/D"}</p>
              </div>
              <div>
                <span className="text-zinc-500">Email</span>
                <p className="font-medium">{user?.email || "N/D"}</p>
              </div>
              <div>
                <span className="text-zinc-500">Rol</span>
                <p>
                  <Badge variant="soft">{roleLabel}</Badge>
                </p>
              </div>
            </div>
            <div>
              <span className="text-sm text-zinc-500">Granjas asignadas</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {assignedFarmNames.map((name) => (
                  <Badge key={name} color="brand" variant="soft">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection title="Avatar">
        <AvatarPicker />
      </PageSection>

      <PageSection title="Seguridad" description="Actualiza tu contraseña de acceso.">
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

          <div className="flex flex-wrap gap-3">
            <Button type="submit" color="brand" loading={changingPassword} loadingText="Guardando...">
              <KeyRound aria-hidden="true" className="size-4" />
              Cambiar contraseña
            </Button>
            <Button type="button" color="danger" variant="outline" onClick={handleLogout}>
              <LogOut aria-hidden="true" className="size-4" />
              Cerrar sesión
            </Button>
          </div>
        </form>
      </PageSection>
    </div>
  );
}
