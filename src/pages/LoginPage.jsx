import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useAuth } from "@/features/auth/AuthContext";
import PageSection from "@/components/layout/PageSection";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api("auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (!response.success) {
        throw new Error(response.message || "No se pudo iniciar sesión");
      }

      login(response.data);
      navigate("/");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <PageSection className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <EmptyStateTitle className="text-2xl">SIRA</EmptyStateTitle>
            <FormDescription>Sistema Integral para Registro Avícola</FormDescription>
          </div>

          <FormControl controlId="username" required>
            <Label>Usuario o correo</Label>
            <Input
              id="username"
              autoComplete="username"
              placeholder="usuario@empresa.com"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </FormControl>

          <FormControl controlId="password" required>
            <Label>Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              passwordToggle
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormControl>

          {error && <Alert color="danger" title={error} />}

          <Button type="submit" loading={loading} loadingText="Entrando..." className="w-full">
            Iniciar sesión
          </Button>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>
      </PageSection>
    </div>
  );
}
