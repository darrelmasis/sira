import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  EmptyStateTitle,
  FormControl,
  FormDescription,
  Input,
  Label,
} from "quickit-ui";
import { api } from "@/lib/api";
import PageSection from "@/components/layout/PageSection";
import { CheckCircle2, Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setTokenError("No se encontró el token de recuperación.");
      return;
    }

    api(`auth/validate-reset-token?token=${encodeURIComponent(token)}`, {
      method: "GET",
    })
      .then((response) => {
        if (response.success) {
          setTokenValid(true);
        } else {
          setTokenError(response.message || "El enlace es inválido o ya expiró.");
        }
      })
      .catch(() => {
        setTokenError("Error al validar el enlace.");
      })
      .finally(() => {
        setValidating(false);
      });
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);

    try {
      const response = await api("auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      if (!response.success) {
        throw new Error(response.message || "Error al restablecer la contraseña");
      }

      setDone(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
        <PageSection className="w-full max-w-sm text-center">
          <FormDescription>Validando enlace...</FormDescription>
        </PageSection>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
        <PageSection className="w-full max-w-sm text-center">
          <div className="space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="size-6 text-green-600 dark:text-green-300" />
            </div>
            <EmptyStateTitle className="text-2xl">Contraseña actualizada</EmptyStateTitle>
            <FormDescription>Tu contraseña fue actualizada correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.</FormDescription>
            <Button className="mt-4 w-full" onClick={() => navigate("/login")}>
              Iniciar sesión
            </Button>
          </div>
        </PageSection>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
        <PageSection className="w-full max-w-sm text-center">
          <div className="space-y-4">
            <Alert color="danger" title={tokenError || "El enlace es inválido o ya expiró."} />
            <Button className="w-full" onClick={() => navigate("/forgot-password")}>
              Solicitar nuevo enlace
            </Button>
          </div>
        </PageSection>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <PageSection className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <EmptyStateTitle className="text-2xl">Nueva contraseña</EmptyStateTitle>
            <FormDescription>Ingresa tu nueva contraseña para acceder a SIRA.</FormDescription>
          </div>

          <FormControl controlId="password" required>
            <Label>Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              passwordToggle
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormControl>

          <FormControl controlId="confirmPassword" required>
            <Label>Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              passwordToggle
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </FormControl>

          {error && <Alert color="danger" title={error} />}

          <Button type="submit" loading={saving} loadingText="Guardando..." className="w-full">
            <Lock aria-hidden="true" className="size-4" />
            Cambiar contraseña
          </Button>
        </form>
      </PageSection>
    </div>
  );
}
