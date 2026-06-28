import { useEffect, useState } from "react";
import { Alert, Badge, Button, FormControl, Input, Label, toast } from "quickit-ui";
import { KeyRound, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import AvatarPicker from "@/features/profile/AvatarPicker";
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
    <div className="mx-auto max-w-2xl space-y-4">
      <PageSection title="Perfil">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>Nombre: {user?.nombre || "N/D"}</div>
          <div>Usuario: @{user?.username || "N/D"}</div>
          <div className="flex items-center gap-2">
            Rol: <Badge variant="soft">{roleLabel}</Badge>
          </div>
          <div className="sm:col-span-2">
            Granjas:{" "}
            {assignedFarmNames.map((name) => (
              <Badge key={name} color="brand" variant="soft" className="mr-1 mt-1">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      </PageSection>

      <PageSection title="Avatar">
        <AvatarPicker />
      </PageSection>

      <PageSection title="Contraseña" description="Actualiza tu contraseña de acceso.">
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && <Alert color="danger" title={passwordError} />}

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
      </PageSection>

      <Button type="button" color="danger" variant="outline" onClick={handleLogout}>
        <LogOut aria-hidden="true" className="size-4" />
        Cerrar sesión
      </Button>
    </div>
  );
}
